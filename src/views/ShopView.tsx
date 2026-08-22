import React, { useState, useEffect } from 'react';
import {
  Filter,
  SlidersHorizontal,
  X,
  ChevronRight,
  Search,
  RotateCcw,
  Sparkles,
  Flame,
  Check
} from 'lucide-react';
import { Product, Category } from '../types';
import { ProductGrid } from '../components/ProductGrid';
import { api } from '../services/api';

interface ShopViewProps {
  initialCategoryId?: string;
  initialSubcategory?: string;
  initialSearch?: string;
  categories: Category[];
  onSelectProduct: (product: Product) => void;
}

export const ShopView: React.FC<ShopViewProps> = ({
  initialCategoryId,
  initialSubcategory,
  initialSearch,
  categories,
  onSelectProduct
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryId || '');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(initialSubcategory || '');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [search, setSearch] = useState<string>(initialSearch || '');
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [hotDealsOnly, setHotDealsOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('featured');

  // Mobile Filter Drawer
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Available brands derived from categories
  const brandsList = [
    'Vitron',
    'Sayona',
    'Ampex',
    'Hisense',
    'TCL',
    'Samsung',
    'LG',
    'Sony',
    'Ramtons',
    'Mika',
    'Schneider',
    'MegaSolar',
    'Hikvision',
    'East Coast'
  ];

  // Fetch products whenever filters change
  const fetchFilteredProducts = async () => {
    setIsLoading(true);
    try {
      const data = await api.getProducts({
        categoryId: selectedCategory || undefined,
        subcategory: selectedSubcategory || undefined,
        brand: selectedBrand || undefined,
        search: search || undefined,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
        inStockOnly: inStockOnly || undefined,
        isHotDeal: hotDealsOnly || undefined,
        sort: sortBy,
        limit: 100
      });
      setProducts(data.products);
      setTotalCount(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredProducts();
  }, [
    selectedCategory,
    selectedSubcategory,
    selectedBrand,
    search,
    minPrice,
    maxPrice,
    inStockOnly,
    hotDealsOnly,
    sortBy
  ]);

  // Sync prop changes
  useEffect(() => {
    if (initialCategoryId !== undefined) setSelectedCategory(initialCategoryId);
    if (initialSubcategory !== undefined) setSelectedSubcategory(initialSubcategory);
    if (initialSearch !== undefined) setSearch(initialSearch);
  }, [initialCategoryId, initialSubcategory, initialSearch]);

  const activeCategoryObj = categories.find((c) => c.id === selectedCategory);

  const resetAllFilters = () => {
    setSelectedCategory('');
    setSelectedSubcategory('');
    setSelectedBrand('');
    setSearch('');
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setInStockOnly(false);
    setHotDealsOnly(false);
    setSortBy('featured');
  };

  const hasActiveFilters =
    Boolean(selectedCategory) ||
    Boolean(selectedSubcategory) ||
    Boolean(selectedBrand) ||
    Boolean(search) ||
    minPrice !== undefined ||
    maxPrice !== undefined ||
    inStockOnly ||
    hotDealsOnly;

  return (
    <div className="bg-[#09090b] text-zinc-100 min-h-screen py-5 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb & Header */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 mb-1.5">
            <span>HOME</span>
            <ChevronRight className="w-3 h-3 text-zinc-600" />
            <span className="text-zinc-200">CATALOG</span>
            {activeCategoryObj && (
              <>
                <ChevronRight className="w-3 h-3 text-zinc-600" />
                <span className="text-red-400 font-bold">{activeCategoryObj.name.toUpperCase()}</span>
              </>
            )}
            {selectedSubcategory && (
              <>
                <ChevronRight className="w-3 h-3 text-zinc-600" />
                <span className="text-zinc-100 font-bold">{selectedSubcategory.toUpperCase()}</span>
              </>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-base sm:text-xl font-black text-zinc-100 tracking-tight font-mono uppercase">
                {activeCategoryObj ? activeCategoryObj.name : search ? `Search: "${search}"` : 'ALL ELECTRONICS'}
              </h1>
              <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                SHOWING {products.length} {products.length === 1 ? 'ITEM' : 'ITEMS'} AVAILABLE FOR CASH ON DELIVERY
              </p>
            </div>

            {/* Sort Dropdown & Mobile Filter Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded text-xs font-mono font-bold text-zinc-200"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-red-500" />
                <span>FILTERS {hasActiveFilters && '•'}</span>
              </button>

              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-zinc-400 hidden sm:inline text-[11px]">SORT:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1.5 outline-none cursor-pointer focus:border-red-500 font-mono font-medium"
                >
                  <option value="featured">Featured / Best Match</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="newest">Newest Arrivals</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-zinc-800 font-mono">
              <span className="text-[10px] text-zinc-400 font-bold uppercase">ACTIVE:</span>
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 bg-zinc-900 text-zinc-200 border border-zinc-800 text-[10px] px-2 py-0.5 rounded">
                  <span>{categories.find((c) => c.id === selectedCategory)?.name}</span>
                  <button onClick={() => setSelectedCategory('')} className="hover:text-red-400">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
              {selectedSubcategory && (
                <span className="inline-flex items-center gap-1 bg-zinc-900 text-zinc-200 border border-zinc-800 text-[10px] px-2 py-0.5 rounded">
                  <span>{selectedSubcategory}</span>
                  <button onClick={() => setSelectedSubcategory('')} className="hover:text-red-400">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
              {selectedBrand && (
                <span className="inline-flex items-center gap-1 bg-zinc-900 text-zinc-200 border border-zinc-800 text-[10px] px-2 py-0.5 rounded">
                  <span>Brand: {selectedBrand}</span>
                  <button onClick={() => setSelectedBrand('')} className="hover:text-red-400">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
              {search && (
                <span className="inline-flex items-center gap-1 bg-zinc-900 text-zinc-200 border border-zinc-800 text-[10px] px-2 py-0.5 rounded">
                  <span>Keyword: "{search}"</span>
                  <button onClick={() => setSearch('')} className="hover:text-red-400">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
              {inStockOnly && (
                <span className="inline-flex items-center gap-1 bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] px-2 py-0.5 rounded">
                  <span>In Stock Only</span>
                  <button onClick={() => setInStockOnly(false)}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
              {hotDealsOnly && (
                <span className="inline-flex items-center gap-1 bg-amber-950 text-amber-300 border border-amber-800 text-[10px] px-2 py-0.5 rounded">
                  <span>Hot Deals Only</span>
                  <button onClick={() => setHotDealsOnly(false)}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}

              <button
                onClick={resetAllFilters}
                className="text-[10px] text-red-400 hover:text-red-300 underline font-bold ml-1.5 cursor-pointer"
              >
                RESET ALL
              </button>
            </div>
          )}
        </div>

        {/* Main 2-Column Layout (Sidebar Filters + Products Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block space-y-4 bg-zinc-900 border border-zinc-800 p-4 rounded-lg h-fit font-mono">
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
              <span className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-red-500" />
                FILTER PRODUCTS
              </span>
              {hasActiveFilters && (
                <button onClick={resetAllFilters} className="text-[10px] text-zinc-400 hover:text-red-400">
                  Clear all
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div>
              <h4 className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-1.5">Category</h4>
              <div className="space-y-0.5">
                <button
                  onClick={() => {
                    setSelectedCategory('');
                    setSelectedSubcategory('');
                  }}
                  className={`w-full text-left px-2 py-1 rounded text-xs font-medium transition ${
                    selectedCategory === '' ? 'bg-red-600 text-white font-bold' : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setSelectedSubcategory('');
                    }}
                    className={`w-full text-left px-2 py-1 rounded text-xs font-medium transition flex items-center justify-between ${
                      selectedCategory === cat.id
                        ? 'bg-red-600 text-white font-bold'
                        : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Subcategories (if category is chosen) */}
            {activeCategoryObj && activeCategoryObj.subcategories.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-1.5">
                  {activeCategoryObj.name} Types
                </h4>
                <div className="space-y-0.5">
                  <button
                    onClick={() => setSelectedSubcategory('')}
                    className={`w-full text-left px-2 py-1 rounded text-xs font-medium transition ${
                      selectedSubcategory === '' ? 'bg-zinc-800 text-red-400 font-bold' : 'text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    All Types
                  </button>
                  {activeCategoryObj.subcategories.map((sub, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedSubcategory(sub)}
                      className={`w-full text-left px-2 py-1 rounded text-xs font-medium transition ${
                        selectedSubcategory === sub ? 'bg-zinc-800 text-red-400 font-bold' : 'text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Brand Filter */}
            <div>
              <h4 className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-1.5">Brand</h4>
              <div className="space-y-0.5 max-h-40 overflow-y-auto pr-1">
                <button
                  onClick={() => setSelectedBrand('')}
                  className={`w-full text-left px-2 py-1 rounded text-xs font-medium transition ${
                    selectedBrand === '' ? 'bg-zinc-800 text-red-400 font-bold' : 'text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  All Brands
                </button>
                {brandsList.map((b) => (
                  <button
                    key={b}
                    onClick={() => setSelectedBrand(b)}
                    className={`w-full text-left px-2 py-1 rounded text-xs font-medium transition flex items-center justify-between ${
                      selectedBrand === b ? 'bg-zinc-800 text-red-400 font-bold' : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <span>{b}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div>
              <h4 className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-1.5">Price Range (KSh)</h4>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="number"
                  placeholder="Min KSh"
                  value={minPrice ?? ''}
                  onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : undefined)}
                  className="bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
                />
                <input
                  type="number"
                  placeholder="Max KSh"
                  value={maxPrice ?? ''}
                  onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : undefined)}
                  className="bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
                />
              </div>
            </div>

            {/* Quick Toggles */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-800 text-xs font-mono">
              <label className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="accent-red-600 rounded"
                />
                <span>In Stock Only</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={hotDealsOnly}
                  onChange={(e) => setHotDealsOnly(e.target.checked)}
                  className="accent-red-600 rounded"
                />
                <span className="flex items-center gap-1 text-amber-400">
                  <Flame className="w-3 h-3" />
                  Hot Deals / Sale
                </span>
              </label>
            </div>
          </aside>

          {/* Product Grid Area */}
          <main className="lg:col-span-3">
            <ProductGrid
              products={products}
              isLoading={isLoading}
              onSelectProduct={onSelectProduct}
            />
          </main>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden font-mono">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsMobileFilterOpen(false)} />
          <div className="relative w-4/5 max-w-xs bg-[#09090b] text-zinc-100 h-full p-4 shadow-2xl flex flex-col z-10 overflow-y-auto space-y-4 border-r border-zinc-800">
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
              <span className="font-bold text-xs text-zinc-100">FILTERS</span>
              <button onClick={() => setIsMobileFilterOpen(false)} className="text-zinc-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category */}
            <div>
              <h4 className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5">Category</h4>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubcategory('');
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs text-zinc-100 font-mono"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div>
              <h4 className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5">Brand</h4>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs text-zinc-100 font-mono"
              >
                <option value="">All Brands</option>
                {brandsList.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggles */}
            <div className="space-y-1.5 text-xs font-mono">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="accent-red-600"
                />
                <span>In Stock Only</span>
              </label>
              <label className="flex items-center gap-2 text-amber-400 font-semibold">
                <input
                  type="checkbox"
                  checked={hotDealsOnly}
                  onChange={(e) => setHotDealsOnly(e.target.checked)}
                  className="accent-red-600"
                />
                <span>Hot Deals Only</span>
              </label>
            </div>

            <button
              onClick={() => setIsMobileFilterOpen(false)}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-mono font-bold py-2 rounded text-xs mt-auto"
            >
              APPLY FILTERS ({products.length} ITEMS)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
