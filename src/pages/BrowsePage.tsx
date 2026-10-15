import React, { useState, useMemo } from 'react';
import { LostFoundItem, ItemCategory } from '../types';
import { Icon } from '../components/common/Icon';
import { Button } from '../components/common/Button';
import { Badge, getStatusTone } from '../components/common/Badge';
import { TypeLabel } from '../components/common/TypeLabel';
import { Dialog } from '../components/common/Dialog';
import { itemService } from '../services/itemService';

export interface BrowsePageProps {
  items: LostFoundItem[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  error?: string | null;
  onLoadMore?: () => void;
  onRetry?: () => void;
  onOpenItem: (item: LostFoundItem) => void;
  onReportClick: () => void;
}

export const BrowsePage: React.FC<BrowsePageProps> = ({
  items,
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  error = null,
  onLoadMore,
  onRetry,
  onOpenItem,
  onReportClick
}) => {
  const [activeTab, setActiveTab] = useState<string>('All');
  const [category, setCategory] = useState<string>('All categories');
  const [location, setLocation] = useState<string>('All locations');
  const [dateRange, setDateRange] = useState<string>('Any date');
  const [statusFilter, setStatusFilter] = useState<string>('All statuses');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showMobileFilter, setShowMobileFilter] = useState<boolean>(false);

  const categories: ItemCategory[] = ['Electronics', 'Cards', 'Keys', 'Bags', 'Clothing', 'Other'];

  // Extract unique locations from loaded items
  const uniqueLocations = useMemo(() => {
    const locs = Array.from(new Set(items.map((i) => i.location))).filter(Boolean);
    return locs;
  }, [items]);

  // Apply filters client-side over loaded visible items
  const filteredItems = useMemo(() => {
    const res = itemService.filterItems(items, {
      type: activeTab,
      category,
      location,
      dateRange,
      query: searchQuery,
      statusFilter
    });
    // Open-first sorting with stable secondary date order
    return itemService.sortOpenFirst(res);
  }, [items, activeTab, category, location, dateRange, searchQuery, statusFilter]);

  const handleClearFilters = () => {
    setActiveTab('All');
    setCategory('All categories');
    setLocation('All locations');
    setDateRange('Any date');
    setStatusFilter('All statuses');
    setSearchQuery('');
  };

  const isFiltered =
    activeTab !== 'All' ||
    category !== 'All categories' ||
    location !== 'All locations' ||
    dateRange !== 'Any date' ||
    statusFilter !== 'All statuses' ||
    searchQuery.trim().length > 0;

  // Filter controls component
  const filterControls = (
    <div className="filters">
      <label>
        <span>Category</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="All categories">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Location</span>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          aria-label="Filter by location"
        >
          <option value="All locations">All locations</option>
          {uniqueLocations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Date range (event date)</span>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          aria-label="Filter by event date"
        >
          <option value="Any date">Any date</option>
          <option value="Past 7 days">Past 7 days</option>
          <option value="Past 30 days">Past 30 days</option>
        </select>
      </label>
    </div>
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">RECOVER BELONGINGS</span>
          <h1>Browse lost and found items</h1>
          <p>Filter active reports by category, location and event date to find a possible match.</p>
        </div>
        <Button icon="plus" onClick={onReportClick}>
          Report an item
        </Button>
      </div>

      {/* Error state */}
      {error && items.length === 0 && (
        <div className="error-panel" role="alert" style={{ margin: '20px 0' }}>
          <Icon name="alert" />
          <div style={{ flex: 1 }}>
            <b>Could not load campus reports:</b> {error}
            {onRetry && (
              <div style={{ marginTop: '10px' }}>
                <Button
                  variant="secondary"
                  style={{ minHeight: '32px', fontSize: '12px' }}
                  onClick={onRetry}
                >
                  Try again
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Browse Tools: Tabs + Search + Mobile filter trigger */}
      <div className="browse-tools">
        <div className="tabs" role="tablist" aria-label="Item types">
          {(['All', 'Lost', 'Found'] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              className={activeTab === tab ? 'active' : ''}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <label className="search-field">
          <Icon name="search" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search loaded items"
            aria-label="Search loaded items"
          />
        </label>

        <Button
          variant="secondary"
          icon="filter"
          className="filter-mobile"
          onClick={() => setShowMobileFilter(true)}
        >
          Filters
        </Button>
      </div>

      {/* Desktop Filter Panel */}
      <div className="filter-panel">{filterControls}</div>

      {/* Results summary bar */}
      <div className="result-bar">
        <p>
          <b>{filteredItems.length}</b> {filteredItems.length === 1 ? 'record' : 'records'}
        </p>
        {isFiltered && (
          <button type="button" onClick={handleClearFilters}>
            Clear filters
          </button>
        )}
        <span>Open reports are shown first</span>
      </div>

      {/* Loading state for initial fetch */}
      {isLoading && items.length === 0 ? (
        <div className="empty" style={{ margin: '40px 0' }}>
          <div>
            <Icon name="search" size={32} />
          </div>
          <h2>Loading reports from campus...</h2>
          <p>Connecting to Cloud Firestore to retrieve active reports.</p>
        </div>
      ) : filteredItems.length > 0 ? (
        /* Item Grid */
        <div className="item-grid">
          {filteredItems.map((item) => (
            <article key={item.id} className="item-card">
              <div className={`item-image item-${item.icon}`} style={{ overflow: 'hidden' }}>
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                ) : (
                  <>
                    <Icon name={item.icon} size={46} />
                    {item.icon === 'image' && <span>No photo</span>}
                  </>
                )}
                <div className="type-float">
                  <TypeLabel type={item.type} />
                </div>
              </div>

              <div className="item-body">
                <div className="item-title-row">
                  <h3>{item.title}</h3>
                  <Badge tone={getStatusTone(item.status)}>{item.status}</Badge>
                </div>
                <p className="category">{item.category}</p>

                <dl className="meta">
                  <div>
                    <dt>Location</dt>
                    <dd>{item.location}</dd>
                  </div>
                  <div>
                    <dt>{item.type === 'Found' ? 'Date found' : 'Date lost'}</dt>
                    <dd>{item.eventDate}</dd>
                  </div>
                </dl>

                <Button
                  variant="secondary"
                  className="card-action"
                  onClick={() => onOpenItem(item)}
                >
                  View details <Icon name="chevron" size={16} />
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="empty">
          <div>
            <Icon name="search" size={30} />
          </div>
          <h2>
            {isFiltered
              ? 'No items match these filters'
              : 'No active reports yet'}
          </h2>
          <p>
            {isFiltered
              ? 'Try clearing a filter or choosing a wider date range.'
              : 'There are currently no active public reports. Be the first to report an item.'}
          </p>
          {isFiltered ? (
            <Button variant="secondary" onClick={handleClearFilters}>
              Clear filters
            </Button>
          ) : (
            <Button icon="plus" onClick={onReportClick}>
              Report an item
            </Button>
          )}
        </div>
      )}

      {/* Pagination / Load more controls */}
      {items.length > 0 && onLoadMore && (
        <div className="load-more">
          {hasMore ? (
            <Button
              variant="secondary"
              onClick={onLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? 'Loading more reports...' : 'Load more reports'}
            </Button>
          ) : (
            <Button variant="secondary" disabled>
              All current reports loaded
            </Button>
          )}
          <p>Showing {filteredItems.length} loaded reports</p>
        </div>
      )}

      {/* Mobile Filter Drawer / Dialog */}
      {showMobileFilter && (
        <Dialog title="Filter items" onClose={() => setShowMobileFilter(false)}>
          {filterControls}
          <div className="dialog-actions">
            <Button variant="ghost" onClick={handleClearFilters}>
              Clear filters
            </Button>
            <Button onClick={() => setShowMobileFilter(false)}>
              Show {filteredItems.length} items
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
};
