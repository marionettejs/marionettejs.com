import { enhanceCharts } from './charts.js';
const data = JSON.parse(document.querySelector('#benchmark-data').textContent);
enhanceCharts(document, data.builds);
