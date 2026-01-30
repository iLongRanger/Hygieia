import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { Table } from '../Table';

interface TestData {
  id: string;
  name: string;
  email: string;
  status: string;
  count: number;
}

describe('Table', () => {
  const sampleData: TestData[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', status: 'active', count: 5 },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'inactive', count: 3 },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', status: 'active', count: 7 },
  ];

  const basicColumns = [
    { header: 'Name', accessorKey: 'name' as keyof TestData },
    { header: 'Email', accessorKey: 'email' as keyof TestData },
    { header: 'Status', accessorKey: 'status' as keyof TestData },
  ];

  describe('Rendering - Basic', () => {
    it('should render table with data', () => {
      render(<Table data={sampleData} columns={basicColumns} />);
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should render all column headers', () => {
      render(<Table data={sampleData} columns={basicColumns} />);
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('should render all data rows', () => {
      render(<Table data={sampleData} columns={basicColumns} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    it('should render correct number of rows', () => {
      const { container } = render(<Table data={sampleData} columns={basicColumns} />);
      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(3);
    });

    it('should render cells with accessor key values', () => {
      render(<Table data={sampleData} columns={basicColumns} />);
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      const activeElements = screen.getAllByText('active');
      expect(activeElements.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('should render empty state when no data', () => {
      render(<Table data={[]} columns={basicColumns} />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should not render table when data is empty', () => {
      const { container } = render(<Table data={[]} columns={basicColumns} />);
      expect(container.querySelector('table')).not.toBeInTheDocument();
    });

    it('should render empty state with proper styling', () => {
      const { container } = render(<Table data={[]} columns={basicColumns} />);
      const emptyState = container.querySelector('.flex.h-48.w-full');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveClass(
        'flex',
        'h-48',
        'w-full',
        'flex-col',
        'items-center',
        'justify-center',
        'rounded-lg',
        'border-2',
        'border-dashed',
        'border-surface-200',
        'p-8',
        'text-center'
      );
    });
  });

  describe('Loading State', () => {
    it('should render loading skeleton when isLoading is true', () => {
      const { container } = render(
        <Table data={sampleData} columns={basicColumns} isLoading={true} />
      );
      const skeletons = container.querySelectorAll('.skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render 5 skeleton rows', () => {
      const { container } = render(
        <Table data={sampleData} columns={basicColumns} isLoading={true} />
      );
      const skeletons = container.querySelectorAll('.skeleton');
      expect(skeletons).toHaveLength(5);
    });

    it('should not render table content when loading', () => {
      render(<Table data={sampleData} columns={basicColumns} isLoading={true} />);
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('should render table when isLoading is false', () => {
      render(<Table data={sampleData} columns={basicColumns} isLoading={false} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('Custom Cell Rendering', () => {
    it('should render custom cell content with cell function', () => {
      const columnsWithCustomCell = [
        { header: 'Name', accessorKey: 'name' as keyof TestData },
        {
          header: 'Status',
          cell: (item: TestData) => <span className="badge">{item.status.toUpperCase()}</span>,
        },
      ];

      render(<Table data={sampleData} columns={columnsWithCustomCell} />);
      const activeElements = screen.getAllByText('ACTIVE');
      expect(activeElements.length).toBeGreaterThan(0);
      expect(screen.getByText('INACTIVE')).toBeInTheDocument();
    });

    it('should prefer cell function over accessorKey', () => {
      const columns = [
        {
          header: 'Custom',
          accessorKey: 'name' as keyof TestData,
          cell: () => <span>Custom Content</span>,
        },
      ];

      render(<Table data={sampleData} columns={columns} />);
      expect(screen.getAllByText('Custom Content')).toHaveLength(3);
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('should render complex custom cells', () => {
      const columns = [
        { header: 'Name', accessorKey: 'name' as keyof TestData },
        {
          header: 'Actions',
          cell: (item: TestData) => (
            <div>
              <button>Edit {item.name}</button>
              <button>Delete</button>
            </div>
          ),
        },
      ];

      render(<Table data={sampleData} columns={columns} />);
      expect(screen.getByRole('button', { name: 'Edit John Doe' })).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(3);
    });

    it('should render numeric values correctly', () => {
      const columns = [
        { header: 'Name', accessorKey: 'name' as keyof TestData },
        { header: 'Count', accessorKey: 'count' as keyof TestData },
      ];

      render(<Table data={sampleData} columns={columns} />);
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
    });
  });

  describe('Column Configuration', () => {
    it('should render column with custom className', () => {
      const columns = [
        { header: 'Name', accessorKey: 'name' as keyof TestData, className: 'font-bold' },
      ];

      const { container } = render(<Table data={sampleData} columns={columns} />);
      const th = container.querySelector('th');
      expect(th).toHaveClass('font-bold');
    });

    it('should render multiple columns with different classNames', () => {
      const columns = [
        { header: 'Name', accessorKey: 'name' as keyof TestData, className: 'w-1/2' },
        { header: 'Email', accessorKey: 'email' as keyof TestData, className: 'w-1/4' },
        { header: 'Status', accessorKey: 'status' as keyof TestData, className: 'w-1/4' },
      ];

      const { container } = render(<Table data={sampleData} columns={columns} />);
      const headers = container.querySelectorAll('th');
      expect(headers[0]).toHaveClass('w-1/2');
      expect(headers[1]).toHaveClass('w-1/4');
      expect(headers[2]).toHaveClass('w-1/4');
    });

    it('should handle columns without accessorKey or cell', () => {
      const columns = [
        { header: 'Name', accessorKey: 'name' as keyof TestData },
        { header: 'Empty' },
      ];

      const { container } = render(<Table data={sampleData} columns={columns as any} />);
      const cells = container.querySelectorAll('tbody tr:first-child td');
      expect(cells[1].textContent).toBe('');
    });
  });

  describe('Row Interactions', () => {
    it('should call onRowClick when row is clicked', async () => {
      const user = userEvent.setup();
      const onRowClick = vi.fn();

      render(<Table data={sampleData} columns={basicColumns} onRowClick={onRowClick} />);

      const firstRow = screen.getByText('John Doe').closest('tr');
      await user.click(firstRow!);

      expect(onRowClick).toHaveBeenCalledTimes(1);
      expect(onRowClick).toHaveBeenCalledWith(sampleData[0]);
    });

    it('should not call onRowClick when not provided', async () => {
      const user = userEvent.setup();
      render(<Table data={sampleData} columns={basicColumns} />);

      const firstRow = screen.getByText('John Doe').closest('tr');
      await user.click(firstRow!);

      // Should not throw error
    });

    it('should add cursor-pointer class when onRowClick is provided', () => {
      render(<Table data={sampleData} columns={basicColumns} onRowClick={vi.fn()} />);

      const firstRow = screen.getByText('John Doe').closest('tr');
      expect(firstRow).toHaveClass('cursor-pointer');
    });

    it('should not add cursor-pointer class when onRowClick is not provided', () => {
      render(<Table data={sampleData} columns={basicColumns} />);

      const firstRow = screen.getByText('John Doe').closest('tr');
      expect(firstRow).not.toHaveClass('cursor-pointer');
    });

    it('should call onRowClick with correct data for each row', async () => {
      const user = userEvent.setup();
      const onRowClick = vi.fn();

      render(<Table data={sampleData} columns={basicColumns} onRowClick={onRowClick} />);

      const row1 = screen.getByText('John Doe').closest('tr');
      const row2 = screen.getByText('Jane Smith').closest('tr');
      const row3 = screen.getByText('Bob Johnson').closest('tr');

      await user.click(row1!);
      expect(onRowClick).toHaveBeenLastCalledWith(sampleData[0]);

      await user.click(row2!);
      expect(onRowClick).toHaveBeenLastCalledWith(sampleData[1]);

      await user.click(row3!);
      expect(onRowClick).toHaveBeenLastCalledWith(sampleData[2]);
    });
  });

  describe('Styling', () => {
    it('should apply base table container styles', () => {
      const { container } = render(<Table data={sampleData} columns={basicColumns} />);
      const tableContainer = container.firstChild as HTMLElement;
      expect(tableContainer).toHaveClass(
        'w-full',
        'overflow-hidden'
      );
    });

    it('should apply custom className to table container', () => {
      const { container } = render(
        <Table data={sampleData} columns={basicColumns} className="custom-table" />
      );
      const tableContainer = container.firstChild as HTMLElement;
      expect(tableContainer).toHaveClass('custom-table');
    });

    it('should have overflow-x-auto for horizontal scrolling', () => {
      const { container } = render(<Table data={sampleData} columns={basicColumns} />);
      const scrollContainer = container.querySelector('.overflow-x-auto');
      expect(scrollContainer).toBeInTheDocument();
    });

    it('should apply header background color', () => {
      const { container } = render(<Table data={sampleData} columns={basicColumns} />);
      const thead = container.querySelector('thead');
      expect(thead).toHaveClass('bg-surface-50');
    });

    it('should apply row hover styles', () => {
      const { container } = render(<Table data={sampleData} columns={basicColumns} />);
      const row = container.querySelector('tbody tr');
      expect(row).toHaveClass('transition-colors', 'hover:bg-surface-100');
    });

    it('should apply row dividers', () => {
      const { container } = render(<Table data={sampleData} columns={basicColumns} />);
      const tbody = container.querySelector('tbody');
      expect(tbody).toHaveClass('divide-y', 'divide-surface-100');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single row of data', () => {
      const singleRow = [sampleData[0]];
      render(<Table data={singleRow} columns={basicColumns} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should handle large datasets', () => {
      const largeData = Array.from({ length: 100 }, (_, i) => ({
        id: String(i),
        name: `User ${i}`,
        email: `user${i}@example.com`,
        status: i % 2 === 0 ? 'active' : 'inactive',
        count: i,
      }));

      const { container } = render(<Table data={largeData} columns={basicColumns} />);
      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(100);
    });

    it('should handle data with special characters', () => {
      const specialData = [
        {
          id: '1',
          name: "O'Brien <script>",
          email: 'test@example.com',
          status: 'active & verified',
          count: 0,
        },
      ];

      render(<Table data={specialData} columns={basicColumns} />);
      expect(screen.getByText("O'Brien <script>")).toBeInTheDocument();
      expect(screen.getByText('active & verified')).toBeInTheDocument();
    });

    it('should handle numeric IDs', () => {
      const numericIdData = [
        { id: 1, name: 'Test', email: 'test@example.com', status: 'active', count: 1 },
      ] as any;

      render(<Table data={numericIdData} columns={basicColumns} />);
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('should handle empty string values', () => {
      const emptyStringData = [
        { id: '1', name: '', email: '', status: '', count: 0 },
      ];

      const { container } = render(<Table data={emptyStringData} columns={basicColumns} />);
      const cells = container.querySelectorAll('tbody td');
      expect(cells).toHaveLength(3);
    });

    it('should handle state changes from loading to loaded', () => {
      const { rerender, container } = render(
        <Table data={sampleData} columns={basicColumns} isLoading={true} />
      );
      expect(container.querySelectorAll('.skeleton')).toHaveLength(5);

      rerender(<Table data={sampleData} columns={basicColumns} isLoading={false} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should handle state changes from loaded to empty', () => {
      const { rerender } = render(<Table data={sampleData} columns={basicColumns} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();

      rerender(<Table data={[]} columns={basicColumns} />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper table structure', () => {
      const { container } = render(<Table data={sampleData} columns={basicColumns} />);
      expect(container.querySelector('table')).toBeInTheDocument();
      expect(container.querySelector('thead')).toBeInTheDocument();
      expect(container.querySelector('tbody')).toBeInTheDocument();
    });

    it('should use th elements for headers', () => {
      const { container } = render(<Table data={sampleData} columns={basicColumns} />);
      const headers = container.querySelectorAll('th');
      expect(headers).toHaveLength(3);
    });

    it('should use td elements for cells', () => {
      const { container } = render(<Table data={sampleData} columns={basicColumns} />);
      const cells = container.querySelectorAll('td');
      expect(cells).toHaveLength(9); // 3 rows × 3 columns
    });

    it('should have proper table role', () => {
      render(<Table data={sampleData} columns={basicColumns} />);
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('Type Safety', () => {
    it('should work with different data types', () => {
      interface CustomData {
        id: number;
        title: string;
        active: boolean;
      }

      const customData: CustomData[] = [
        { id: 1, title: 'First', active: true },
        { id: 2, title: 'Second', active: false },
      ];

      const customColumns = [
        { header: 'ID', accessorKey: 'id' as keyof CustomData },
        { header: 'Title', accessorKey: 'title' as keyof CustomData },
        {
          header: 'Active',
          cell: (item: CustomData) => (item.active ? 'Yes' : 'No'),
        },
      ];

      render(<Table data={customData} columns={customColumns} />);
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument();
    });
  });
});
