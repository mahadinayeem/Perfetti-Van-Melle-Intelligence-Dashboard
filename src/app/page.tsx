'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  Search,
  Calendar,
  Users,
  Store,
  Clock,
  CheckCircle2,
  TrendingUp,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Check,
  RotateCcw,
  Sparkles,
  LogOut,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export interface MTRecord {
  id?: string;
  date: string;
  area: string;
  territory: string;
  dbCode: string;
  dbName: string;
  srPositionCode: string;
  srCode: string;
  srName: string;
  routeCode: string;
  routeName: string;
  customerNo: string;
  customerName: string;
  clockInTime: string;
  clockOutTime: string;
  timeSpentMinutes?: number;
}

type ColumnKey = keyof MTRecord;

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  width?: string;
  pillType?: 'sr' | 'route' | 'cust' | 'timeIn' | 'timeOut' | 'bold';
}

const TABLE_COLUMNS: ColumnConfig[] = [
  { key: 'date', label: 'Date', pillType: 'bold' },
  { key: 'area', label: 'Area' },
  { key: 'territory', label: 'Territory' },
  { key: 'dbCode', label: 'DB Code', pillType: 'route' },
  { key: 'dbName', label: 'DB Name' },
  { key: 'srPositionCode', label: 'SR Position Code', pillType: 'sr' },
  { key: 'srCode', label: 'SR Code', pillType: 'bold' },
  { key: 'srName', label: 'SR Name' },
  { key: 'routeCode', label: 'Route Code', pillType: 'route' },
  { key: 'routeName', label: 'Route Name' },
  { key: 'customerNo', label: 'Customer No', pillType: 'cust' },
  { key: 'customerName', label: 'Customer Name', pillType: 'bold' },
  { key: 'clockInTime', label: 'Clock In Time', pillType: 'timeIn' },
  { key: 'clockOutTime', label: 'Clock Out Time', pillType: 'timeOut' },
];

export default function DashboardPage() {
  const router = useRouter();

  // Auth Protection: Redirect to /login if unauthenticated
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = localStorage.getItem('pvm_auth');
      if (!auth) {
        router.push('/login');
      }
    }
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pvm_auth');
      localStorage.removeItem('pvm_user');
    }
    router.push('/login');
  };

  const [records, setRecords] = useState<MTRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metaInfo, setMetaInfo] = useState<any>(null);

  // Helper to format date YYYY-MM-DD in local time
  const formatYMD = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  // Date range filters (Default: Today on initial entry, as requested)
  const [startDate, setStartDate] = useState(() => formatYMD(new Date()));
  const [endDate, setEndDate] = useState(() => formatYMD(new Date()));
  const [globalSearch, setGlobalSearch] = useState('');

  // Pagination State
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Column Filters State: { [columnKey]: Set of selected values }
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});
  
  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: ColumnKey; direction: 'asc' | 'desc' } | null>(null);

  // Active Open Filter Dropdown Column
  const [openFilterCol, setOpenFilterCol] = useState<string | null>(null);
  const [filterSearch, setFilterSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenFilterCol(null);
        setFilterSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch report data directly from live Sokrio API
  const fetchData = async (start = startDate, end = endDate) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/mt-visit-status?start=${start}&end=${end}`);
      const json = await res.json();
      if (json.success) {
        setRecords(json.data || []);
        setMetaInfo(json.meta || null);
        setCurrentPage(1);
      } else {
        setError(json.message || 'Failed to load report');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to report service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(startDate, endDate);
  }, [startDate, endDate]);

  // Quick preset helper (MTD, WTD, Today)
  const applyPreset = (preset: 'mtd' | 'wtd' | 'today') => {
    const now = new Date();
    const todayStr = formatYMD(now);

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'mtd') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(formatYMD(startOfMonth));
      setEndDate(todayStr);
    } else if (preset === 'wtd') {
      // In Bangladesh (FMCG sales week), week starts on Saturday
      const diffToSat = (now.getDay() + 1) % 7;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - diffToSat);
      setStartDate(formatYMD(startOfWeek));
      setEndDate(todayStr);
    }
  };

  // Check active preset
  const activePreset = useMemo(() => {
    const now = new Date();
    const todayStr = formatYMD(now);
    const startOfMonth = formatYMD(new Date(now.getFullYear(), now.getMonth(), 1));
    const diffToSat = (now.getDay() + 1) % 7;
    const startOfWeekDate = new Date(now);
    startOfWeekDate.setDate(now.getDate() - diffToSat);
    const startOfWeek = formatYMD(startOfWeekDate);

    if (startDate === todayStr && endDate === todayStr) return 'today';
    if (startDate === startOfWeek && endDate === todayStr) return 'wtd';
    if (startDate === startOfMonth && endDate === todayStr) return 'mtd';
    return null;
  }, [startDate, endDate]);

  // Unique values for each column based on raw records
  const uniqueColumnValues = useMemo(() => {
    const map: Record<string, string[]> = {};
    TABLE_COLUMNS.forEach(({ key }) => {
      const distinct = new Set<string>();
      records.forEach((r) => {
        const val = String(r[key] || '').trim();
        if (val) distinct.add(val);
      });
      map[key] = Array.from(distinct).sort();
    });
    return map;
  }, [records]);

  // Filter and sort records
  const filteredAndSortedRecords = useMemo(() => {
    let result = records.filter((r) => {
      // 1. Global Search
      if (globalSearch.trim()) {
        const q = globalSearch.toLowerCase();
        const matchesGlobal = TABLE_COLUMNS.some(({ key }) =>
          String(r[key] || '').toLowerCase().includes(q)
        );
        if (!matchesGlobal) return false;
      }

      // 2. Column-level Excel Filters
      for (const [colKey, selectedValues] of Object.entries(columnFilters)) {
        if (selectedValues && selectedValues.size > 0) {
          const val = String(r[colKey as ColumnKey] || '').trim();
          if (!selectedValues.has(val)) {
            return false;
          }
        }
      }

      return true;
    });

    // 3. Sorting
    if (sortConfig) {
      const { key, direction } = sortConfig;
      result = [...result].sort((a, b) => {
        const valA = String(a[key] || '');
        const valB = String(b[key] || '');
        const cmp = valA.localeCompare(valB, undefined, { numeric: true });
        return direction === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [records, globalSearch, columnFilters, sortConfig]);

  // Total active filter count
  const activeFiltersCount = useMemo(() => {
    return Object.values(columnFilters).filter((set) => set && set.size > 0).length;
  }, [columnFilters]);

  // Pagination logic
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(filteredAndSortedRecords.length / pageSize));

  const paginatedRecords = useMemo(() => {
    if (pageSize === -1) return filteredAndSortedRecords;
    const startIdx = (currentPage - 1) * pageSize;
    return filteredAndSortedRecords.slice(startIdx, startIdx + pageSize);
  }, [filteredAndSortedRecords, currentPage, pageSize]);

  // Toggle single value in column filter
  const toggleColumnValue = (colKey: string, value: string) => {
    setColumnFilters((prev) => {
      const current = new Set(prev[colKey] || uniqueColumnValues[colKey] || []);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      return { ...prev, [colKey]: current };
    });
  };

  // Select all or deselect all for a column
  const toggleSelectAll = (colKey: string) => {
    const allVals = uniqueColumnValues[colKey] || [];
    setColumnFilters((prev) => {
      const current = prev[colKey];
      if (current && current.size === allVals.length) {
        // Deselect all
        return { ...prev, [colKey]: new Set() };
      } else {
        // Select all
        return { ...prev, [colKey]: new Set(allVals) };
      }
    });
  };

  // Clear specific column filter
  const clearColumnFilter = (colKey: string) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      delete next[colKey];
      return next;
    });
    setOpenFilterCol(null);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setColumnFilters({});
    setGlobalSearch('');
    setSortConfig(null);
  };

  // Set sorting
  const handleSort = (key: ColumnKey, direction: 'asc' | 'desc') => {
    setSortConfig({ key, direction });
    setOpenFilterCol(null);
  };

  // Download Excel
  const handleExportExcel = () => {
    const exportData = filteredAndSortedRecords.map((r) => ({
      Date: r.date,
      Area: r.area,
      Territory: r.territory,
      'DB Code': r.dbCode,
      'DB Name': r.dbName,
      'SR Position Code': r.srPositionCode,
      'SR Code': r.srCode,
      'SR Name': r.srName,
      'Route Code': r.routeCode,
      'Route Name': r.routeName,
      'Customer No': r.customerNo,
      'Customer Name': r.customerName,
      'Clock In Time': r.clockInTime,
      'Clock Out Time': r.clockOutTime,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MT Visit Status');

    // Column widths
    const maxCols = [12, 18, 18, 12, 18, 18, 12, 22, 22, 26, 20, 36, 22, 22];
    worksheet['!cols'] = maxCols.map((w) => ({ wch: w }));

    XLSX.writeFile(workbook, `PVM_MT_Visit_Status_${startDate}_to_${endDate}.xlsx`);
  };

  // Download CSV
  const handleExportCSV = () => {
    const exportData = filteredAndSortedRecords.map((r) => ({
      Date: r.date,
      Area: r.area,
      Territory: r.territory,
      'DB Code': r.dbCode,
      'DB Name': r.dbName,
      'SR Position Code': r.srPositionCode,
      'SR Code': r.srCode,
      'SR Name': r.srName,
      'Route Code': r.routeCode,
      'Route Name': r.routeName,
      'Customer No': r.customerNo,
      'Customer Name': r.customerName,
      'Clock In Time': r.clockInTime,
      'Clock Out Time': r.clockOutTime,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PVM_MT_Visit_Status_${startDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // KPI Calculations
  const totalVisits = filteredAndSortedRecords.length;
  const uniqueCustomersCount = new Set(filteredAndSortedRecords.map((r) => r.customerNo).filter(Boolean)).size;
  const uniqueSRCount = new Set(filteredAndSortedRecords.map((r) => r.srCode).filter(Boolean)).size;

  // Average time spent calculation as per clock in and clock out time
  const avgTimeSpentData = useMemo(() => {
    let totalSeconds = 0;
    let count = 0;

    filteredAndSortedRecords.forEach((r) => {
      if (r.clockInTime && r.clockOutTime) {
        const inMs = new Date(r.clockInTime.replace(/-/g, '/')).getTime();
        const outMs = new Date(r.clockOutTime.replace(/-/g, '/')).getTime();
        if (!isNaN(inMs) && !isNaN(outMs) && outMs >= inMs) {
          const diffSec = (outMs - inMs) / 1000;
          if (diffSec < 86400) {
            totalSeconds += diffSec;
            count++;
          }
        }
      }
    });

    if (count === 0) return { formatted: '0m 00s', subtext: 'Clock-In to Clock-Out' };

    const avgSec = Math.round(totalSeconds / count);
    const mins = Math.floor(avgSec / 60);
    const secs = avgSec % 60;
    const formatted = mins > 0 ? `${mins}m ${String(secs).padStart(2, '0')}s` : `${secs}s`;
    return {
      formatted,
      subtext: `Avg per visit (${count} recorded)`,
    };
  }, [filteredAndSortedRecords]);

  return (
    <div className="portal-container">
      {/* 1. Brand Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="brand-section">
            <div className="brand-logo-wrap">
              <Image
                src="/pvm-logo.png"
                alt="Perfetti Van Melle Logo"
                width={120}
                height={40}
                style={{ objectFit: 'contain', height: 34, width: 'auto' }}
                priority
              />
            </div>
            <div className="brand-divider-line"></div>
            <div className="sokrio-header-logo-wrap">
              <Image
                src="/sokrio-logo.png"
                alt="Sokrio SFA Logo"
                width={110}
                height={36}
                style={{ objectFit: 'contain', height: 28, width: 'auto' }}
                priority
              />
            </div>
            <div className="brand-info">
              <h1 id="portal-title">Perfetti Van Melle</h1>
              <p id="portal-subtitle">Intelligence Dashboard</p>
            </div>
          </div>

          <div className="header-meta">
            <div className="status-badge" id="live-connection-badge">
              <span className="status-dot"></span>
              <span>Sokrio Live SFA API</span>
            </div>

            {/* User Profile & Logout */}
            <div className="user-profile-header">
              <div className="user-pill">
                <span className="user-avatar-circle">SA</span>
                <span>Super Admin</span>
              </div>
              <button
                id="btn-logout"
                className="btn-logout"
                onClick={handleLogout}
                title="Log out of PVM SFA Portal"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Excel Sheet Tabs Bar (Clean, single active sheet) */}
      <nav className="excel-tabs-bar" aria-label="Workbook Sheets">
        <div className="excel-tabs-container">
          <div className="excel-tab-active" id="tab-mt-visit-status">
            <FileSpreadsheet size={16} style={{ color: 'var(--excel-green)' }} />
            <span>MT Visit Status</span>
            <span className="tab-live-badge">LIVE SHEET</span>
          </div>
        </div>
      </nav>

      {/* 3. Main Dashboard Body */}
      <main className="dashboard-main">
        {/* Upgraded Premium KPI Cards */}
        <section className="kpi-grid" aria-label="Key Performance Indicators">
          {/* Card 1: Total MT Visits */}
          <div className="kpi-card-premium kpi-card-blue" id="kpi-total-visits">
            <div className="kpi-top-row">
              <span className="kpi-title">Total MT Visits</span>
              <div className="kpi-icon-pill icon-blue">
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="kpi-middle-row">
              <span className="kpi-main-val">{totalVisits}</span>
              <span className="kpi-subtext">Verified Check-ins</span>
            </div>
            <div className="kpi-progress-bar">
              <div className="kpi-progress-fill fill-blue" style={{ width: '100%' }}></div>
            </div>
          </div>

          {/* Card 2: Unique Outlets */}
          <div className="kpi-card-premium kpi-card-green" id="kpi-unique-outlets">
            <div className="kpi-top-row">
              <span className="kpi-title">Unique Outlets</span>
              <div className="kpi-icon-pill icon-green">
                <Store size={20} />
              </div>
            </div>
            <div className="kpi-middle-row">
              <span className="kpi-main-val">{uniqueCustomersCount}</span>
              <span className="kpi-subtext">Distinct Outlets Visited</span>
            </div>
            <div className="kpi-progress-bar">
              <div
                className="kpi-progress-fill fill-green"
                style={{ width: `${Math.min(100, uniqueCustomersCount * 8)}%` }}
              ></div>
            </div>
          </div>

          {/* Card 3: Active MT SRs */}
          <div className="kpi-card-premium kpi-card-purple" id="kpi-active-srs">
            <div className="kpi-top-row">
              <span className="kpi-title">Active Field Force</span>
              <div className="kpi-icon-pill icon-purple">
                <Users size={20} />
              </div>
            </div>
            <div className="kpi-middle-row">
              <span className="kpi-main-val">{uniqueSRCount}</span>
              <span className="kpi-subtext">MT Sales Representatives</span>
            </div>
            <div className="kpi-progress-bar">
              <div className="kpi-progress-fill fill-purple" style={{ width: '100%' }}></div>
            </div>
          </div>

          {/* Card 4: Average Time Spent (Clock-In to Clock-Out) */}
          <div className="kpi-card-premium kpi-card-amber" id="kpi-avg-time-spent">
            <div className="kpi-top-row">
              <span className="kpi-title">Average Time Spent</span>
              <div className="kpi-icon-pill icon-amber">
                <Clock size={20} />
              </div>
            </div>
            <div className="kpi-middle-row">
              <span className="kpi-main-val">{avgTimeSpentData.formatted}</span>
              <span className="kpi-subtext">{avgTimeSpentData.subtext}</span>
            </div>
            <div className="kpi-progress-bar">
              <div
                className="kpi-progress-fill fill-amber"
                style={{ width: '100%' }}
              ></div>
            </div>
          </div>
        </section>

        {/* Control Bar: Date Selector, Global Search, Export Buttons */}
        <section className="control-panel" aria-label="Controls">
          <div className="date-controls-group">
            <div className="input-label">
              <Calendar size={15} style={{ color: 'var(--primary)' }} />
              <span>Date Range:</span>
            </div>

            <input
              type="date"
              id="filter-start-date"
              className="custom-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>to</span>
            <input
              type="date"
              id="filter-end-date"
              className="custom-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />

            {/* Quick Presets: MTD, WTD, Today */}
            <div className="quick-presets-group" aria-label="Quick Date Presets">
              <button
                id="btn-preset-mtd"
                type="button"
                className={`btn-preset ${activePreset === 'mtd' ? 'active' : ''}`}
                onClick={() => applyPreset('mtd')}
                title="Month-to-Date (1st of month to today)"
              >
                MTD
              </button>
              <button
                id="btn-preset-wtd"
                type="button"
                className={`btn-preset ${activePreset === 'wtd' ? 'active' : ''}`}
                onClick={() => applyPreset('wtd')}
                title="Week-to-Date (Start of week to today)"
              >
                WTD
              </button>
              <button
                id="btn-preset-today"
                type="button"
                className={`btn-preset ${activePreset === 'today' ? 'active' : ''}`}
                onClick={() => applyPreset('today')}
                title="Today"
              >
                Today
              </button>
            </div>

            {/* Global Search Box */}
            <div className="search-box-wrap">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                id="search-input"
                className="custom-input search-input"
                placeholder="Search across all fields..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
            </div>

            {/* Clear All Filters button if any active */}
            {(activeFiltersCount > 0 || globalSearch || sortConfig) && (
              <button
                id="btn-reset-filters"
                className="btn-reset-filters"
                onClick={clearAllFilters}
                title="Reset all active column and search filters"
              >
                <RotateCcw size={13} />
                <span>Reset Filters ({activeFiltersCount})</span>
              </button>
            )}
          </div>

          {/* Action & Export Buttons */}
          <div className="action-buttons">
            <button
              id="btn-refresh"
              className="btn btn-outline"
              onClick={() => fetchData(startDate, endDate)}
              disabled={loading}
              title="Refresh live data from Sokrio API"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              id="btn-download-excel"
              className="btn btn-export-excel"
              onClick={handleExportExcel}
              disabled={filteredAndSortedRecords.length === 0}
              title="Download Excel file with MT Visit Status format"
            >
              <Download size={15} />
              <span>Download Excel (.xlsx)</span>
            </button>

            <button
              id="btn-download-csv"
              className="btn btn-outline"
              onClick={handleExportCSV}
              disabled={filteredAndSortedRecords.length === 0}
            >
              <Download size={14} />
              <span>CSV</span>
            </button>
          </div>
        </section>

        {/* 4. Main Data Table with Column-level Excel Filters */}
        <div className="table-card">
          <div className="table-header-bar">
            <div className="table-header-title">
              <FileSpreadsheet size={18} style={{ color: 'var(--excel-green)' }} />
              <span>MT Visit Status Sheet</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                ({filteredAndSortedRecords.length} of {records.length} records)
              </span>
            </div>
            {metaInfo && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Data Source: <strong style={{ color: 'var(--primary)' }}>{metaInfo.source}</strong>
              </div>
            )}
          </div>

          <div className="table-wrapper">
            {loading ? (
              <div className="empty-state">
                <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto', color: 'var(--primary)' }} />
                <h3>Connecting to Sokrio SFA...</h3>
                <p>Retrieving real-time Modern Trade visit logs</p>
              </div>
            ) : filteredAndSortedRecords.length === 0 ? (
              <div className="empty-state">
                <Filter size={36} style={{ margin: '0 auto', color: 'var(--text-dim)' }} />
                <h3>No Matching Records</h3>
                <p>No visits matched the selected filters or date range.</p>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: 12 }}
                  onClick={clearAllFilters}
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <table className="modern-table" id="mt-visit-status-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', background: '#f1f5f9', borderRight: '1px solid #e2e8f0' }}>#</th>

                    {TABLE_COLUMNS.map(({ key, label }) => {
                      const isFiltered = columnFilters[key] && columnFilters[key].size > 0;
                      const isSorted = sortConfig?.key === key;
                      const isOpen = openFilterCol === key;
                      const uniqueVals = uniqueColumnValues[key] || [];

                      const displayedVals = uniqueVals.filter((v) =>
                        v.toLowerCase().includes(filterSearch.toLowerCase())
                      );

                      return (
                        <th key={key} className="excel-th">
                          <div className="excel-th-inner">
                            <span className="excel-th-title">{label}</span>

                            {/* Excel Header Filter Trigger (Image 2 style) */}
                            <button
                              id={`filter-trigger-${key}`}
                              className={`excel-filter-trigger ${isFiltered ? 'filtered' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isOpen) {
                                  setOpenFilterCol(null);
                                  setFilterSearch('');
                                } else {
                                  setOpenFilterCol(key);
                                  setFilterSearch('');
                                }
                              }}
                              title={`Filter or Sort by ${label}`}
                            >
                              {isSorted ? (
                                sortConfig.direction === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                              ) : (
                                <ArrowUpDown size={11} />
                              )}
                            </button>
                          </div>

                          {/* Excel Filter Dropdown Popup Modal */}
                          {isOpen && (
                            <div
                              ref={dropdownRef}
                              className="excel-filter-popup"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Sort buttons */}
                              <div className="popup-sort-row">
                                <button
                                  className="popup-sort-btn"
                                  onClick={() => handleSort(key, 'asc')}
                                >
                                  <ArrowUp size={12} /> Sort A to Z
                                </button>
                                <button
                                  className="popup-sort-btn"
                                  onClick={() => handleSort(key, 'desc')}
                                >
                                  <ArrowDown size={12} /> Sort Z to A
                                </button>
                              </div>

                              {/* Search inside values */}
                              <input
                                type="text"
                                className="popup-search-input"
                                placeholder={`Search ${label}...`}
                                value={filterSearch}
                                onChange={(e) => setFilterSearch(e.target.value)}
                                autoFocus
                              />

                              {/* Select All / Clear Row */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 4px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600 }}>
                                  <input
                                    type="checkbox"
                                    checked={
                                      !columnFilters[key] ||
                                      columnFilters[key].size === uniqueVals.length
                                    }
                                    onChange={() => toggleSelectAll(key)}
                                  />
                                  <span>(Select All)</span>
                                </label>
                                {isFiltered && (
                                  <button
                                    className="popup-link-btn"
                                    onClick={() => clearColumnFilter(key)}
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>

                              {/* Unique values checklist */}
                              <div className="popup-values-list">
                                {displayedVals.length === 0 ? (
                                  <div style={{ padding: '8px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
                                    No matches
                                  </div>
                                ) : (
                                  displayedVals.map((val) => {
                                    const checked =
                                      !columnFilters[key] || columnFilters[key].has(val);
                                    return (
                                      <label key={val} className="popup-value-item">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => toggleColumnValue(key, val)}
                                        />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {val}
                                        </span>
                                      </label>
                                    );
                                  })
                                )}
                              </div>

                              {/* Popup footer */}
                              <div className="popup-actions-row">
                                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                                  {uniqueVals.length} unique values
                                </span>
                                <button
                                  className="popup-link-btn"
                                  style={{ color: 'var(--excel-green)' }}
                                  onClick={() => setOpenFilterCol(null)}
                                >
                                  Done
                                </button>
                              </div>
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {paginatedRecords.map((row, idx) => {
                    const rowNumber = pageSize === -1 ? idx + 1 : (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr key={row.id || idx}>
                        <td style={{ color: 'var(--text-dim)', fontSize: 11, textAlign: 'center' }}>{rowNumber}</td>
                        <td><strong>{row.date}</strong></td>
                        <td>{row.area}</td>
                        <td>{row.territory}</td>
                        <td><span className="cell-pill pill-route">{row.dbCode}</span></td>
                        <td>{row.dbName}</td>
                        <td><span className="cell-pill pill-sr">{row.srPositionCode}</span></td>
                        <td><strong>{row.srCode}</strong></td>
                        <td>{row.srName}</td>
                        <td><span className="cell-pill pill-route">{row.routeCode}</span></td>
                        <td>{row.routeName}</td>
                        <td><span className="cell-pill pill-cust">{row.customerNo}</span></td>
                        <td><strong>{row.customerName}</strong></td>
                        <td>
                          {row.clockInTime ? (
                            <span className="pill-time-in">{row.clockInTime}</span>
                          ) : (
                            '--'
                          )}
                        </td>
                        <td>
                          {row.clockOutTime ? (
                            <span className="pill-time-out">{row.clockOutTime}</span>
                          ) : (
                            <span style={{ color: '#f59e0b', fontStyle: 'italic', fontSize: 12 }}>Pending Out</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Table Pagination Bar */}
          {!loading && filteredAndSortedRecords.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 24px',
              borderTop: '1px solid var(--border)',
              background: '#f8fafc',
              fontSize: '13px',
              color: 'var(--text-muted)'
            }}>
              <div>
                Showing <strong>{pageSize === -1 ? 1 : (currentPage - 1) * pageSize + 1}</strong> to{' '}
                <strong>{pageSize === -1 ? filteredAndSortedRecords.length : Math.min(currentPage * pageSize, filteredAndSortedRecords.length)}</strong> of{' '}
                <strong>{filteredAndSortedRecords.length}</strong> records
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Rows per page:</span>
                  <select
                    className="custom-input"
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={-1}>All ({filteredAndSortedRecords.length})</option>
                  </select>
                </div>

                {pageSize !== -1 && totalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <span style={{ fontWeight: 600 }}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>Perfetti Van Melle Bangladesh &bull; Modern Trade Operations & Intelligence Portal</p>
      </footer>
    </div>
  );
}
