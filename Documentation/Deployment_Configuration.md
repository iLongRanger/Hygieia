# Hygieia Platform - Deployment & Environment Configuration

## Overview

This specification defines deployment architectures, environment configurations, and infrastructure requirements for the Hygieia Platform across development, staging, and production environments.

## Environment Architecture

### Development Environment
- **Purpose:** Local development and testing
- **Infrastructure:** Local Docker containers
- **Database:** Local PostgreSQL with Docker
- **Storage:** Local file system
- **Authentication:** Supabase local development

### Staging Environment
- **Purpose:** Pre-production testing and QA
- **Infrastructure:** AWS ECS with Fargate
- **Database:** RDS PostgreSQL (dev-db instance)
- **Storage:** S3 bucket (staging-assets)
- **Authentication:** Supabase staging project

### Production Environment
- **Purpose:** Live customer operations
- **Infrastructure:** AWS ECS with Fargate (multi-AZ)
- **Database:** RDS PostgreSQL (production cluster)
- **Storage:** S3 bucket (production-assets) with CloudFront
- **Authentication:** Supabase production project

## Container Configuration

### Docker Base Images

```dockerfile
# API Service Dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .
EXPOSE 3000
USER node
CMD ["npm", "start"]

# Web Service Dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .
RUN npm run build
EXPOSE 3000
USER node
CMD ["npm", "start"]
```

### Docker Compose - Development

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/hygieia_dev
      - REDIS_URL=redis://redis:6379
      - SUPABASE_URL=http://supabase_kong:8000
    volumes:
      - ./apps/api:/app
      - /app/node_modules
    depends_on:
      - postgres
      - redis
      - supabase_db

  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_URL=http://localhost:3001
      - NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
    volumes:
      - ./apps/web:/app
      - /app/node_modules
      - /app/.next

  postgres:
    image: postgres:14-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=hygieia_dev
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  supabase_db:
    image: supabase/postgres:14.1.0.88
    ports:
      - "54322:5432"
    environment:
      - POSTGRES_DB=supabase_db
      - POSTGRES_USER=supabase_admin
      - POSTGRES_PASSWORD=supabase_password
    volumes:
      - supabase_db_data:/var/lib/postgresql/data

  supabase_auth:
    image: supabase/gotrue:v2.45.0
    ports:
      - "54321:54321"
    environment:
      - GOTRUE_API_HOST=0.0.0.0
      - GOTRUE_DB_DRIVER=postgres
      - GOTRUE_DB_DATABASE_URL=postgresql://supabase_admin:supabase_password@supabase_db:5432/supabase_db
      - GOTRUE_JWT_SECRET=your-super-secret-jwt-token
      - GOTRUE_JWT_EXP=3600
    depends_on:
      - supabase_db

  supabase_kong:
    image: kong:2.8.1
    ports:
      - "8000:8000"
      - "8443:8443"
    environment:
      - KONG_DATABASE=postgres
      - KONG_PG_HOST=supabase_db
      - KONG_PG_DATABASE=kong
      - KONG_PG_USER=kong
      - KONG_PG_PASSWORD=kong_password
    depends_on:
      - supabase_db

volumes:
  postgres_data:
  redis_data:
  supabase_db_data:
```

## AWS Infrastructure

### ECS Task Definitions

```json
{
  "family": "hygieia-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "account.dkr.ecr.region.amazonaws.com/hygieia-api:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:hygieia/database-url"
        },
        {
          "name": "SUPABASE_JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:hygieia/supabase-jwt"
        },
        {
          "name": "REDIS_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:hygieia/redis-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/hygieia-api",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### Application Load Balancer Configuration

```yaml
# infrastructure/alb.yml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Hygieia Platform Application Load Balancer'

Resources:
  HygieiaLoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: hygieia-alb
      Scheme: internet-facing
      Type: application
      Subnets:
        - subnet-12345
        - subnet-67890
      SecurityGroups:
        - sg-12345
      IpAddressType: ipv4

  API TargetGroup:
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      Name: hygieia-api-tg
      Port: 3001
      Protocol: HTTP
      VpcId: vpc-12345
      HealthCheckPath: /health
      HealthCheckIntervalSeconds: 30
      HealthCheckTimeoutSeconds: 5
      HealthyThresholdCount: 2
      UnhealthyThresholdCount: 3
      Matcher:
        HttpCode: '200'

  WebTargetGroup:
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      Name: hygieia-web-tg
      Port: 3000
      Protocol: HTTP
      VpcId: vpc-12345
      HealthCheckPath: /
      HealthCheckIntervalSeconds: 30
      HealthCheckTimeoutSeconds: 5
      HealthyThresholdCount: 2
      UnhealthyThresholdCount: 3

  APIListener:
    Type: AWS::ElasticLoadBalancingV2::Listener
    Properties:
      LoadBalancerArn: !Ref HygieiaLoadBalancer
      Port: 443
      Protocol: HTTPS
      Certificates:
        - CertificateArn: arn:aws:acm:region:account:certificate/cert-12345
      DefaultActions:
        - Type: forward
          TargetGroupArn: !Ref APITargetGroup

  WebListener:
    Type: AWS::ElasticLoadBalancingV2::Listener
    Properties:
      LoadBalancerArn: !Ref HygieiaLoadBalancer
      Port: 80
      Protocol: HTTP
      DefaultActions:
        - Type: forward
          TargetGroupArn: !Ref WebTargetGroup
```

### RDS Configuration

```yaml
# infrastructure/rds.yml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Hygieia Platform RDS Database'

Resources:
  DatabaseSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: 'Subnet group for Hygieia RDS'
      SubnetIds:
        - subnet-12345
        - subnet-67890
        - subnet-abcde

  DatabaseSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: 'Security group for RDS'
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 5432
          ToPort: 5432
          SourceSecurityGroupId: sg-ecs-security-group

  DatabaseCluster:
    Type: AWS::RDS::DBCluster
    Properties:
      DBClusterIdentifier: hygieia-db-cluster
      Engine: postgres
      EngineMode: provisioned
      EngineVersion: '14.9'
      MasterUsername: postgres
      MasterUserPassword: !Ref DatabasePassword
      BackupRetentionPeriod: 7
      PreferredBackupWindow: '03:00-04:00'
      PreferredMaintenanceWindow: 'sun:04:00-sun:05:00'
      StorageEncrypted: true
      DBSubnetGroupName: !Ref DatabaseSubnetGroup
      VpcSecurityGroupIds:
        - !Ref DatabaseSecurityGroup
      DeletionProtection: true

  DatabaseInstance1:
    Type: AWS::RDS::DBInstance
    Properties:
      DBClusterIdentifier: !Ref DatabaseCluster
      DBInstanceIdentifier: hygieia-db-instance-1
      DBInstanceClass: db.t3.medium
      Engine: postgres
      EngineVersion: '14.9'
      PubliclyAccessible: false
      StorageType: gp2
      AllocatedStorage: 100
      StorageEncrypted: true

  DatabaseInstance2:
    Type: AWS::RDS::DBInstance
    Properties:
      DBClusterIdentifier: !Ref DatabaseCluster
      DBInstanceIdentifier: hygieia-db-instance-2
      DBInstanceClass: db.t3.medium
      Engine: postgres
      EngineVersion: '14.9'
      PubliclyAccessible: false
      StorageType: gp2
      AllocatedStorage: 100
      StorageEncrypted: true

Parameters:
  DatabasePassword:
    Type: String
    NoEcho: true
    Description: 'Password for the RDS database'
```

## Environment Variables Configuration

### Development Environment

```bash
# .env.development
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/hygieia_dev
DB_ENCRYPTION_KEY=dev-encryption-key-32-chars

# Supabase
SUPABASE_URL=http://localhost:8000
SUPABASE_ANON_KEY=dev-anon-key
SUPABASE_JWT_SECRET=dev-jwt-secret

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# File Storage
STORAGE_TYPE=local
STORAGE_PATH=./uploads
FILE_ENCRYPTION_KEY=dev-file-encryption-key-64-chars

# Email
EMAIL_SERVICE=console
RESEND_API_KEY=

# QuickBooks (Sandbox)
QUICKBOOKS_ENVIRONMENT=sandbox
QUICKBOOKS_CLIENT_ID=sandbox-client-id
QUICKBOOKS_CLIENT_SECRET=sandbox-client-secret

# Logging
LOG_LEVEL=debug
LOG_FORMAT=dev

# Security
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_ENABLED=false

# Features
FEATURE_EMAIL_NOTIFICATIONS=false
FEATURE_QUICKBOOKS_SYNC=true
FEATURE_FILE_ENCRYPTION=false
```

### Staging Environment

```bash
# .env.staging
NODE_ENV=staging
PORT=3001

# Database
DATABASE_URL=postgresql://user:password@staging-db.hygieia.com:5432/hygieia_staging
DB_ENCRYPTION_KEY=${ssm:/hygieia/staging/db-encryption-key}

# Supabase
SUPABASE_URL=https://staging.supabase.co
SUPABASE_ANON_KEY=${ssm:/hygieia/staging/supabase-anon-key}
SUPABASE_JWT_SECRET=${ssm:/hygieia/staging/supabase-jwt-secret}

# Redis
REDIS_URL=redis://staging-redis.hygieia.com:6379
REDIS_PASSWORD=${ssm:/hygieia/staging/redis-password}

# File Storage
STORAGE_TYPE=s3
AWS_S3_BUCKET=hygieia-staging-assets
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=${ssm:/hygieia/staging/aws-access-key}
AWS_SECRET_ACCESS_KEY=${ssm:/hygieia/staging/aws-secret-key}
FILE_ENCRYPTION_KEY=${ssm:/hygieia/staging/file-encryption-key}

# Email
EMAIL_SERVICE=resend
RESEND_API_KEY=${ssm:/hygieia/staging/resend-api-key}

# QuickBooks (Sandbox)
QUICKBOOKS_ENVIRONMENT=sandbox
QUICKBOOKS_CLIENT_ID=${ssm:/hygieia/staging/quickbooks-client-id}
QUICKBOOKS_CLIENT_SECRET=${ssm:/hygieia/staging/quickbooks-client-secret}

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Security
CORS_ORIGIN=https://staging.hygieia.com
RATE_LIMIT_ENABLED=true

# Features
FEATURE_EMAIL_NOTIFICATIONS=true
FEATURE_QUICKBOOKS_SYNC=true
FEATURE_FILE_ENCRYPTION=true
```

### Production Environment

```bash
# .env.production
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=${ssm:/hygieia/production/database-url}
DB_ENCRYPTION_KEY=${ssm:/hygieia/production/db-encryption-key}

# Supabase
SUPABASE_URL=${ssm:/hygieia/production/supabase-url}
SUPABASE_ANON_KEY=${ssm:/hygieia/production/supabase-anon-key}
SUPABASE_JWT_SECRET=${ssm:/hygieia/production/supabase-jwt-secret}

# Redis
REDIS_URL=${ssm:/hygieia/production/redis-url}
REDIS_PASSWORD=${ssm:/hygieia/production/redis-password}

# File Storage
STORAGE_TYPE=s3
AWS_S3_BUCKET=hygieia-production-assets
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=${ssm:/hygieia/production/aws-access-key}
AWS_SECRET_ACCESS_KEY=${ssm:/hygieia/production/aws-secret-key}
FILE_ENCRYPTION_KEY=${ssm:/hygieia/production/file-encryption-key}

# Email
EMAIL_SERVICE=resend
RESEND_API_KEY=${ssm:/hygieia/production/resend-api-key}

# QuickBooks (Production)
QUICKBOOKS_ENVIRONMENT=production
QUICKBOOKS_CLIENT_ID=${ssm:/hygieia/production/quickbooks-client-id}
QUICKBOOKS_CLIENT_SECRET=${ssm:/hygieia/production/quickbooks-client-secret}

# Logging
LOG_LEVEL=warn
LOG_FORMAT=json

# Security
CORS_ORIGIN=https://app.hygieia.com,https://admin.hygieia.com
RATE_LIMIT_ENABLED=true

# Features
FEATURE_EMAIL_NOTIFICATIONS=true
FEATURE_QUICKBOOKS_SYNC=true
FEATURE_FILE_ENCRYPTION=true
```

## CI/CD Pipeline Configuration

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  AWS_REGION: us-west-2
  ECR_REPOSITORY: hygieia-api
  ECS_CLUSTER: hygieia-cluster
  ECS_SERVICE: hygieia-api-service

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          cd apps/api && npm ci
          cd ../web && npm ci
      
      - name: Run linting
        run: |
          cd apps/api && npm run lint
          cd ../web && npm run lint
      
      - name: Run tests
        run: |
          cd apps/api && npm test
          cd ../web && npm test
      
      - name: Build applications
        run: |
          cd apps/api && npm run build
          cd ../web && npm run build

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build, tag, and push image to Amazon ECR
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG ./apps/api
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT
      
      - name: Deploy to Amazon ECS
        run: |
          aws ecs update-service --cluster $ECS_CLUSTER --service $ECS_SERVICE --force-new-deployment
          aws ecs wait services-stable --cluster $ECS_CLUSTER --services $ECS_SERVICE
      
      - name: Run smoke tests
        run: |
          # Wait for deployment to be ready
          sleep 60
          
          # Run health checks
          curl -f https://api.hygieia.com/health
          curl -f https://app.hygieia.com/
          
          # Run API smoke tests
          npm run smoke-tests
```

### Terraform Configuration

```hcl
# infrastructure/terraform/main.tf
provider "aws" {
  region = var.aws_region
}

# VPC Configuration
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "3.19.0"

  name = "hygieia-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-west-2a", "us-west-2b", "us-west-2c"]
  private_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets   = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  enable_vpn_gateway = false
  enable_dns_hostnames = true
  enable_dns_support = true

  tags = {
    Name        = "hygieia-vpc"
    Environment = var.environment
    Project     = "hygieia"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "hygieia-${var.environment}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "hygieia-${var.environment}-cluster"
    Environment = var.environment
    Project     = "hygieia"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "hygieia-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnets

  enable_deletion_protection = false

  tags = {
    Name        = "hygieia-${var.environment}-alb"
    Environment = var.environment
    Project     = "hygieia"
  }
}
```

## Database Migration Strategy

### Migration Scripts

```javascript
// scripts/migrate.js
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

class MigrationManager {
  constructor(databaseUrl) {
    this.client = new Client(databaseUrl);
  }

  async init() {
    await this.client.connect();
    
    // Create migrations table if it doesn't exist
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  async migrate() {
    const migrationsPath = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      const alreadyExecuted = await this.checkMigrationExecuted(file);
      if (!alreadyExecuted) {
        await this.executeMigration(file, migrationsPath);
      }
    }
  }

  async checkMigrationExecuted(filename) {
    const result = await this.client.query(
      'SELECT 1 FROM migrations WHERE filename = $1',
      [filename]
    );
    return result.rows.length > 0;
  }

  async executeMigration(filename, migrationsPath) {
    const migrationSQL = fs.readFileSync(
      path.join(migrationsPath, filename),
      'utf8'
    );

    console.log(`Executing migration: ${filename}`);
    
    try {
      await this.client.query('BEGIN');
      await this.client.query(migrationSQL);
      await this.client.query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [filename]
      );
      await this.client.query('COMMIT');
      console.log(`Migration ${filename} executed successfully`);
    } catch (error) {
      await this.client.query('ROLLBACK');
      console.error(`Migration ${filename} failed:`, error);
      throw error;
    }
  }

  async rollback(version) {
    // Implement rollback logic for disaster recovery
    const rollbackFile = `rollback_${version}.sql`;
    const rollbackPath = path.join(__dirname, 'rollbacks', rollbackFile);
    
    if (fs.existsSync(rollbackPath)) {
      const rollbackSQL = fs.readFileSync(rollbackPath, 'utf8');
      await this.client.query(rollbackSQL);
      console.log(`Rollback to version ${version} completed`);
    } else {
      throw new Error(`Rollback file ${rollbackFile} not found`);
    }
  }

  async close() {
    await this.client.end();
  }
}

// Usage
const migrationManager = new MigrationManager(process.env.DATABASE_URL);

if (process.argv[2] === 'migrate') {
  migrationManager.migrate()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
```

## Monitoring & Observability

### CloudWatch Alarms

```yaml
# infrastructure/monitoring.yml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Hygieia Platform Monitoring'

Resources:
  HighErrorRateAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: hygieia-high-error-rate
      AlarmDescription: 'High error rate detected'
      MetricName: ErrorCount
      Namespace: AWS/ApplicationELB
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 2
      Threshold: 10
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - arn:aws:sns:region:account:hygieia-alerts

  HighResponseTimeAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: hygieia-high-response-time
      AlarmDescription: 'High response time detected'
      MetricName: TargetResponseTime
      Namespace: AWS/ApplicationELB
      Statistic: Average
      Period: 300
      EvaluationPeriods: 3
      Threshold: 2.0
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - arn:aws:sns:region:account:hygieia-alerts

  DatabaseConnectionAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: hygieia-db-connections-high
      AlarmDescription: 'High database connections'
      MetricName: DatabaseConnections
      Namespace: AWS/RDS
      Dimensions:
        - Name: DBInstanceIdentifier
          Value: hygieia-db-instance-1
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 80
      ComparisonOperator: GreaterThanThreshold
```

---

**This deployment specification is mandatory. All deployments must follow these configurations exactly. Any modifications require DevOps team approval.**