/* Chart definitions for the research page — one CsoChart config per chart.
   Table codes verified against the live CSO API July 2026 (see docs/cso-data-pipeline.md).
   Dimension ids: age C02076V02508 · sex C02199V02655 · CPI groups C04624V05409 ·
   NA001 items C03399V04176 · property type C02803V03373 · house type C02342V02816 ·
   state C02196V02652 */
(function () {
  'use strict';

  var CHARTS = [
    {
      mount: 'cc-unemp', slug: 'unemployment', matrix: 'MUM01',
      title: 'Unemployment Rate (seasonally adjusted)',
      source: 'Seasonally Adjusted Monthly Unemployment',
      stats: [
        { code: 'MUM01C02', label: 'Rate (%)', suffix: '%', dp: 1 },
        { code: 'MUM01C01', label: "Persons ('000)", suffix: 'k', dp: 1 }
      ],
      sliceDim: 'C02076V02508',
      defaultSlices: ['316'],
      fixed: { 'C02199V02655': '-' },
      zeroBase: true
    },
    {
      mount: 'cc-cpi', slug: 'inflation', matrix: 'CPM20',
      title: 'Consumer Price Index',
      source: 'Consumer Price Index by Commodity Group',
      stats: [
        { code: 'CPM20C08', label: 'Annual inflation (%)', suffix: '%', dp: 1 },
        { code: 'CPM20C06', label: 'Index (Dec 2023 = 100)', dp: 1 }
      ],
      sliceDim: 'C04624V05409',
      sliceLabels: {
        CP00: 'All items', CP01: 'Food & drink', CP02: 'Alcohol & tobacco',
        CP03: 'Clothing & footwear', CP04: 'Housing & energy', CP05: 'Furnishings',
        CP06: 'Health', CP07: 'Transport', CP08: 'Communication',
        CP09: 'Recreation & culture', CP10: 'Education', CP11: 'Restaurants & hotels',
        CP12: 'Insurance & finance', CP13: 'Personal care & misc'
      },
      defaultSlices: ['CP00'],
      zeroBase: false
    },
    {
      mount: 'cc-natinc', slug: 'national-income', matrix: 'NA001',
      title: 'National Income Aggregates (current prices)',
      source: 'Modified Gross National Income at Current Market Prices',
      stats: [
        { code: 'NA001C01', label: '€ billion', prefix: '€', suffix: 'bn', dp: 0, scale: 0.001 }
      ],
      sliceDim: 'C03399V04176',
      sliceCodes: ['01', '03', '06', '10'],
      sliceLabels: { '01': 'GDP', '03': 'GNP', '06': 'GNI', '10': 'GNI* (modified)' },
      defaultSlices: ['01', '10'],
      zeroBase: true
    },
    {
      mount: 'cc-houses', slug: 'house-prices', matrix: 'HPM09',
      title: 'Residential Property Prices',
      source: 'Residential Property Price Index',
      stats: [
        { code: 'HPM09C01', label: 'Index (Jan 2005 = 100)', dp: 1 },
        { code: 'HPM09C04', label: 'Annual change (%)', suffix: '%', dp: 1 }
      ],
      sliceDim: 'C02803V03373',
      sliceCodes: ['-', '01', '02', '05', '06', '07'],
      sliceLabels: {
        '-': 'National — all', '01': 'National — houses', '02': 'National — apartments',
        '05': 'Dublin — all', '06': 'Dublin — houses', '07': 'Dublin — apartments'
      },
      defaultSlices: ['-', '05'],
      zeroBase: false
    },
    {
      mount: 'cc-completions', slug: 'dwelling-completions', matrix: 'NDQ01',
      title: 'New Dwelling Completions (per quarter)',
      source: 'New Dwelling Completions',
      stats: [
        { code: 'NDQ01', label: 'Completions', dp: 0 },
        { code: 'NDQ01C02', label: 'Seasonally adjusted', dp: 0 }
      ],
      sliceDim: 'C02342V02816',
      sliceLabels: {
        '-': 'All types', '06': 'Single house', '07': 'Scheme house', '08': 'Apartment'
      },
      defaultSlices: ['-'],
      zeroBase: true
    },
    {
      mount: 'cc-debt', slug: 'gov-debt', matrix: 'GFQ12',
      title: 'Government Debt (% of GDP)',
      source: 'Gross General Government Debt as a Percentage of GDP',
      stats: [
        { code: 'GFQ12', label: '% of GDP', suffix: '%', dp: 1 }
      ],
      sliceDim: null,
      fixed: { 'C02196V02652': '-' },
      zeroBase: true
    },
    {
      mount: 'cc-govfin', slug: 'government-finance', matrix: 'GFA01',
      title: 'Government Revenue, Expenditure & Deficit',
      source: 'General Government Transactions ESA 2010',
      stats: [
        { code: 'GFA01', label: '€ billion', prefix: '€', suffix: 'bn', dp: 1, scale: 0.001 }
      ],
      sliceDim: 'C03144V03796',
      sliceCodes: ['01', '09', '21'],
      sliceLabels: { '01': 'Revenue', '09': 'Expenditure', '21': 'Surplus / Deficit (B9)' },
      defaultSlices: ['01', '09', '21'],
      zeroBase: false
    },
    {
      mount: 'cc-bop', slug: 'balance-of-payments', matrix: 'BPQ15',
      title: 'Balance of Payments (BPM6, quarterly)',
      source: 'Current, Capital and Financial Account Balances BPM6',
      stats: [
        { code: 'BPQ15', label: '€ billion', prefix: '€', suffix: 'bn', dp: 1, scale: 0.001 }
      ],
      sliceDim: 'C03142V03794',
      sliceCodes: ['01', '03', '04', '05'],
      sliceLabels: {
        '01': 'Current account', '03': 'Merchandise', '04': 'Services', '05': 'Primary income'
      },
      defaultSlices: ['01'],
      zeroBase: false
    },
    {
      mount: 'cc-services-trade', slug: 'services-trade', matrix: 'BPA04',
      title: 'Trade in Services',
      source: 'Exports and Imports of Services',
      stats: [
        { code: 'BPA04C01', label: 'Exports', prefix: '€', suffix: 'bn', dp: 1, scale: 0.001 },
        { code: 'BPA04C02', label: 'Imports', prefix: '€', suffix: 'bn', dp: 1, scale: 0.001 }
      ],
      sliceDim: 'C02950V03565',
      sliceCodes: ['-', '06', '08', '01', '02', '04', '05', '07'],
      sliceLabels: {
        '-': 'All services', '06': 'Computer services', '08': 'Business services',
        '01': 'Transport', '02': 'Tourism & travel', '04': 'Insurance',
        '05': 'Financial services', '07': 'Royalties & licences'
      },
      defaultSlices: ['-', '06'],
      fixed: { 'C02677V03567': '-01' },
      zeroBase: true
    },
    {
      mount: 'cc-industry', slug: 'industrial-production', matrix: 'MIM05',
      title: 'Industrial Production (2021 = 100)',
      source: 'Industrial Production Volume and Turnover Indices',
      stats: [
        { code: 'MIM05C03', label: 'Production (SA)', dp: 1 },
        { code: 'MIM05C04', label: 'Turnover (SA)', dp: 1 }
      ],
      sliceDim: 'C02576V03125',
      sliceCodes: ['V1100', 'W0780', 'V1300', '21', '26', '10'],
      sliceLabels: {
        V1100: 'All industries', W0780: 'Modern sector', V1300: 'Traditional sector',
        '21': 'Pharmaceuticals', '26': 'Electronics', '10': 'Food products'
      },
      defaultSlices: ['W0780', 'V1300'],
      zeroBase: false
    },
    {
      mount: 'cc-retail', slug: 'retail-sales', matrix: 'RSM08',
      title: 'Retail Sales Index (2021 = 100)',
      source: 'Retail Sales Index NACE Rev 2',
      stats: [
        { code: 'RSM08C04', label: 'Volume (SA)', dp: 1 },
        { code: 'RSM08C03', label: 'Value (SA)', dp: 1 }
      ],
      sliceDim: 'C02583V03135',
      sliceCodes: ['V3970', '45', '4711', '4719', '4730', '5630'],
      sliceLabels: {
        V3970: 'All retail', '45': 'Motor trades', '4711': 'Supermarkets',
        '4719': 'Department stores', '4730': 'Automotive fuel', '5630': 'Bars'
      },
      defaultSlices: ['V3970'],
      zeroBase: false
    },
    {
      mount: 'cc-servicesidx', slug: 'services-index', matrix: 'MSI03',
      title: 'Services Activity Index (2021 = 100)',
      source: 'Monthly Services Index',
      stats: [
        { code: 'MSI03C05', label: 'Volume (SA)', dp: 1 },
        { code: 'MSI03C03', label: 'Value (SA)', dp: 1 }
      ],
      sliceDim: 'C02904V03500',
      sliceCodes: ['-', 'J', 'I', 'G', 'M', 'H'],
      sliceLabels: {
        '-': 'All services', J: 'Information & communication', I: 'Accommodation & food',
        G: 'Wholesale & retail', M: 'Professional & technical', H: 'Transport & storage'
      },
      defaultSlices: ['-', 'J', 'I'],
      zeroBase: false
    },
    {
      mount: 'cc-trade', slug: 'merchandise-trade', matrix: 'TSM01',
      title: 'Merchandise Trade (€bn per month)',
      source: 'Value of Merchandise Trade',
      stats: [
        { code: 'TSM01C2', label: 'Exports', prefix: '€', suffix: 'bn', dp: 1, scale: 1e-6 },
        { code: 'TSM01C1', label: 'Imports', prefix: '€', suffix: 'bn', dp: 1, scale: 1e-6 },
        { code: 'TSM01C3', label: 'Trade surplus', prefix: '€', suffix: 'bn', dp: 1, scale: 1e-6 },
        { code: 'TSM01S2', label: 'Exports (SA)', prefix: '€', suffix: 'bn', dp: 1, scale: 1e-6 },
        { code: 'TSM01S1', label: 'Imports (SA)', prefix: '€', suffix: 'bn', dp: 1, scale: 1e-6 },
        { code: 'TSM01S3', label: 'Surplus (SA)', prefix: '€', suffix: 'bn', dp: 1, scale: 1e-6 }
      ],
      sliceDim: 'STATISTIC',
      defaultSlices: ['TSM01C2', 'TSM01C1'],
      fixed: { 'C02196V02652': '-' },
      zeroBase: false
    }
  ];

  var PIES = [
    {
      mount: 'cc-taxpie', slug: 'tax-revenue', matrix: 'ITXS01',
      title: 'Tax Revenue by Source',
      source: "Ireland's Tax Statistics",
      query: { C04052V04814: ['-'] },
      fixedExtra: { C04052V04814: '-' },
      catDim: 'STATISTIC',
      topN: 9,
      scale: 0.001, prefix: '€', suffix: 'bn', dp: 1,
      labelClean: function (s) { return s.replace(/\s*\([^)]*\)\s*$/, ''); }
    },
    {
      mount: 'cc-sppie', slug: 'social-protection', matrix: 'SPEA02',
      title: 'Social Protection Expenditure by Function',
      source: 'Social Benefits Protection Expenditure by Function',
      query: { C03908V04660: ['1110000', '1120000', '1130000', '1140000', '1150000', '1160000', '1170000', '1180000', '1200000'] },
      catDim: 'C03908V04660',
      scale: 0.001, prefix: '€', suffix: 'bn', dp: 1,
      labelClean: function (s) { return s.replace(/^Expenditure,\s*/, '').replace(/\s*n\.e\.c\.\s*$/, ''); }
    }
  ];

  function init() {
    if (typeof CsoChart === 'undefined') return;
    CHARTS.forEach(function (cfg) { CsoChart.create(cfg); });
    if (typeof CsoPie !== 'undefined') {
      PIES.forEach(function (cfg) { CsoPie.create(cfg); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
