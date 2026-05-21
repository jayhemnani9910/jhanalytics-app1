import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomerPicker } from './CustomerPicker';
import { useStore } from '../store/useStore';
import type { Customer } from '../types';

describe('CustomerPicker', () => {
  const mockCustomers: Customer[] = [
    { id: '1', name: 'Paresh Bhai', nameLower: 'paresh bhai', phone: '9876543210', gender: 'male', notes: '', createdAt: 0, updatedAt: 0 },
    { id: '2', name: 'Jhanvi Patel', nameLower: 'jhanvi patel', phone: '1234567890', gender: 'female', notes: '', createdAt: 0, updatedAt: 0 },
  ];

  beforeEach(() => {
    useStore.setState({
      customers: mockCustomers,
      settings: { language: 'en', seeded: true },
    });
  });

  it('renders input for search when no value is provided', () => {
    render(<CustomerPicker value="" onSelect={() => {}} />);
    expect(screen.getByPlaceholderText('Select Customer')).toBeInTheDocument();
  });

  it('renders selected customer details and change button', () => {
    const handleSelect = vi.fn();
    render(<CustomerPicker value="1" onSelect={handleSelect} />);
    expect(screen.getByText('Paresh Bhai')).toBeInTheDocument();
    expect(screen.getByText('9876543210')).toBeInTheDocument();
    
    const changeBtn = screen.getByText('Change');
    fireEvent.click(changeBtn);
    expect(handleSelect).toHaveBeenCalledWith('');
  });

  it('filters customer list based on query', () => {
    render(<CustomerPicker value="" onSelect={() => {}} />);
    const input = screen.getByPlaceholderText('Select Customer');
    
    fireEvent.change(input, { target: { value: 'Patel' } });
    expect(screen.getByText('Jhanvi Patel')).toBeInTheDocument();
    expect(screen.queryByText('Paresh Bhai')).not.toBeInTheDocument();
  });

  it('calls onSelect when a customer item is clicked', () => {
    const handleSelect = vi.fn();
    render(<CustomerPicker value="" onSelect={handleSelect} />);
    const input = screen.getByPlaceholderText('Select Customer');
    
    fireEvent.change(input, { target: { value: 'Paresh' } });
    const item = screen.getByText('Paresh Bhai');
    fireEvent.click(item);
    expect(handleSelect).toHaveBeenCalledWith('1');
  });

  it('shows add button if no exact match is found', () => {
    render(<CustomerPicker value="" onSelect={() => {}} />);
    const input = screen.getByPlaceholderText('Select Customer');
    
    fireEvent.change(input, { target: { value: 'New User' } });
    expect(screen.getByText('＋ Add: "New User"')).toBeInTheDocument();
  });
});
