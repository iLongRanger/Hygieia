import { describe, expect, it } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { DollarSign } from 'lucide-react';
import StatCard from '../StatCard';

describe('StatCard', () => {
  it('renders label, value, and positive change indicator', () => {
    render(
      <StatCard
        label="Revenue"
        value={12500}
        subtitle="Monthly"
        icon={DollarSign}
        color="text-green-600"
        bg="bg-green-100"
        change={12.4}
      />
    );

    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('12,500')).toBeInTheDocument();
    expect(screen.getByText('12.4%')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
  });

  it('renders negative change correctly', () => {
    render(
      <StatCard
        label="Leads"
        value={42}
        icon={DollarSign}
        color="text-blue-600"
        bg="bg-blue-100"
        change={-8}
      />
    );

    expect(screen.getByText('Leads')).toBeInTheDocument();
    expect(screen.getByText('8%')).toBeInTheDocument();
  });
});
