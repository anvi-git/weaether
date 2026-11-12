/**
 * MeteoVision Charts
 * Gestione dei grafici interattivi con Chart.js
 */

let tempChartInstance = null;
let precipWindChartInstance = null;

const Charts = {
  // Distrugge le istanze esistenti per evitare memory leak e conflitti di render
  destroyCharts() {
    if (tempChartInstance) {
      tempChartInstance.destroy();
      tempChartInstance = null;
    }
    if (precipWindChartInstance) {
      precipWindChartInstance.destroy();
      precipWindChartInstance = null;
    }
  },

  // Formatta la data per le etichette (es. "12 Ott")
  formatDateLabel(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  },

  renderTemperatureHistory(canvasId, dailyRecords, isFahrenheit = false) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (tempChartInstance) {
      tempChartInstance.destroy();
      tempChartInstance = null;
    }

    if (!dailyRecords || dailyRecords.length === 0) return;

    const ctx = canvas.getContext('2d');
    const labels = dailyRecords.map(r => this.formatDateLabel(r.date));
    
    // Funzione conversione unità con protezione da null
    const convert = (c) => {
      if (c === null || c === undefined) return null;
      return isFahrenheit ? Math.round((c * 9/5 + 32) * 10) / 10 : Math.round(c * 10) / 10;
    };

    const maxTemps = dailyRecords.map(r => convert(r.temp_max));
    const minTemps = dailyRecords.map(r => convert(r.temp_min));
    const meanTemps = dailyRecords.map(r => convert(r.temp_mean));

    const unitSymbol = isFahrenheit ? '°F' : '°C';

    // Gradient per l'area massima
    const gradientMax = ctx.createLinearGradient(0, 0, 0, 280);
    gradientMax.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
    gradientMax.addColorStop(1, 'rgba(239, 68, 68, 0.02)');

    // Gradient per l'area minima
    const gradientMin = ctx.createLinearGradient(0, 0, 0, 280);
    gradientMin.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
    gradientMin.addColorStop(1, 'rgba(59, 130, 246, 0.01)');

    tempChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: `Max (${unitSymbol})`,
            data: maxTemps,
            borderColor: '#f87171',
            backgroundColor: gradientMax,
            fill: '+1',
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: dailyRecords.length > 30 ? 0 : 3.5,
            pointHoverRadius: 6,
            pointBackgroundColor: '#ef4444'
          },
          {
            label: `Media (${unitSymbol})`,
            data: meanTemps,
            borderColor: '#fbbf24',
            borderDash: [4, 4],
            backgroundColor: 'transparent',
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointBackgroundColor: '#f59e0b'
          },
          {
            label: `Min (${unitSymbol})`,
            data: minTemps,
            borderColor: '#60a5fa',
            backgroundColor: gradientMin,
            fill: false,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: dailyRecords.length > 30 ? 0 : 3.5,
            pointHoverRadius: 6,
            pointBackgroundColor: '#3b82f6'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#e2e8f0',
              font: { size: 12, family: 'Inter, system-ui, sans-serif' },
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(255, 255, 255, 0.15)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (context) => {
                const val = context.parsed.y;
                return val !== null ? ` ${context.dataset.label}: ${val} ${unitSymbol}` : ` ${context.dataset.label}: N/D`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false
            },
            ticks: {
              color: '#94a3b8',
              font: { size: 11 },
              maxTicksLimit: 10
            }
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.08)',
              drawBorder: false
            },
            ticks: {
              color: '#94a3b8',
              font: { size: 11 },
              callback: (value) => `${value}${unitSymbol}`
            }
          }
        }
      }
    });
  },

  renderPrecipitationWindHistory(canvasId, dailyRecords, isImperial = false) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (precipWindChartInstance) {
      precipWindChartInstance.destroy();
      precipWindChartInstance = null;
    }

    if (!dailyRecords || dailyRecords.length === 0) return;

    const ctx = canvas.getContext('2d');
    const labels = dailyRecords.map(r => this.formatDateLabel(r.date));
    
    const precipUnit = isImperial ? 'in' : 'mm';
    const windUnit = isImperial ? 'mph' : 'km/h';

    const precips = dailyRecords.map(r => {
      const p = r.precipitation;
      if (p === null || p === undefined) return 0;
      return isImperial ? +(p * 0.0393701).toFixed(2) : +(p.toFixed(1));
    });

    const winds = dailyRecords.map(r => {
      const w = r.wind_speed_max;
      if (w === null || w === undefined) return null;
      return isImperial ? +(w * 0.621371).toFixed(1) : +(w.toFixed(1));
    });

    precipWindChartInstance = new Chart(ctx, {
      data: {
        labels: labels,
        datasets: [
          {
            type: 'bar',
            label: `Precipitazioni (${precipUnit})`,
            data: precips,
            backgroundColor: 'rgba(56, 189, 248, 0.6)',
            borderColor: '#38bdf8',
            borderWidth: 1,
            borderRadius: 4,
            yAxisID: 'yPrecip'
          },
          {
            type: 'line',
            label: `Vento max (${windUnit})`,
            data: winds,
            borderColor: '#34d399',
            backgroundColor: 'transparent',
            tension: 0.35,
            borderWidth: 2,
            pointRadius: dailyRecords.length > 30 ? 0 : 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#10b981',
            yAxisID: 'yWind'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#e2e8f0',
              font: { size: 12, family: 'Inter, system-ui, sans-serif' },
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(255, 255, 255, 0.15)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (context) => {
                const val = context.parsed.y;
                const isBar = context.dataset.type === 'bar';
                const unit = isBar ? precipUnit : windUnit;
                return ` ${context.dataset.label}: ${val !== null ? val : 'N/D'} ${unit}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false
            },
            ticks: {
              color: '#94a3b8',
              font: { size: 11 },
              maxTicksLimit: 10
            }
          },
          yPrecip: {
            type: 'linear',
            position: 'left',
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.08)',
              drawBorder: false
            },
            ticks: {
              color: '#38bdf8',
              font: { size: 11 },
              callback: (v) => `${v} ${precipUnit}`
            }
          },
          yWind: {
            type: 'linear',
            position: 'right',
            beginAtZero: true,
            grid: {
              drawOnChartArea: false
            },
            ticks: {
              color: '#34d399',
              font: { size: 11 },
              callback: (v) => `${v} ${windUnit}`
            }
          }
        }
      }
    });
  }
};
