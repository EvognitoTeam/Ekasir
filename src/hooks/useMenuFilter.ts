import { useMemo, useState } from 'react';
import { useMenuStore } from '../store/menu.store';

export function useMenuFilter() {
  const { items } = useMenuStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const searchResults = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) return items;

    return items.filter((item) => {
      const name = item.name?.toLowerCase() ?? '';
      const description = item.description?.toLowerCase() ?? '';

      return name.includes(normalizedQuery) || description.includes(normalizedQuery);
    });
  }, [items, searchQuery]);

  const filteredItems = useMemo(() => {
    if (!selectedCategoryId) return searchResults;

    return searchResults.filter(
      (item) => item.categoryId?.toString() === selectedCategoryId,
    );
  }, [searchResults, selectedCategoryId]);

  return {
    searchQuery,
    setSearchQuery,
    selectedCategoryId,
    setSelectedCategoryId,
    filteredItems,
    searchResults,
  };
}
