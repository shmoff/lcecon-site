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

  function init() {
    if (typeof CsoChart === 'undefined') return;
    CHARTS.forEach(function (cfg) { CsoChart.create(cfg); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
