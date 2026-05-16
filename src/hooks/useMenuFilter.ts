import { useState, useMemo } from 'react';
import { useMenuStore } from '../store/menu.store';

export function useMenuFilter() {
  const { items } = useMenuStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesCategory = selectedCategoryId ? item.categoryId === selectedCategoryId : true;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [items, searchQuery, selectedCategoryId]);

  return {
    searchQuery,
    setSearchQuery,
    selectedCategoryId,
    setSelectedCategoryId,
    filteredItems,
  };
}
