import Component from '@ember/component'; // eslint-disable-line
import { Promise } from 'rsvp';
import ResizeAware from 'ember-resize/mixins/resize-aware'; // eslint-disable-line
import numeral from 'numeral';
import { select } from 'd3-selection';
import { scaleLinear, scaleBand } from 'd3-scale';
import { max } from 'd3-array';

export default Component.extend(ResizeAware, {
  init() {
    this._super(...arguments);

    const numeral_format = this.get('numeral_format');
    const percent = (number) => {
      return numeral(number).format(numeral_format);
    };
    const defaultTooltip = (d, current) => {
      const selected = current || d;
      const percent = this.get('percent');
      const { column, overlayColumn, unit, moe } = this.getProperties('column', 'overlayColumn', 'unit', 'moe');
      return `${selected.boro_district}: <strong>${percent(selected[column])}${unit}</strong><span class='moe-text'>${moe ? `(± ${percent(selected[moe])}${unit})` : ''}</span>`;
    };
    const tooltip = this.get('tooltip') || defaultTooltip;

    this.setProperties({
      percent,
      tooltip,
    });
  },

  classNames: ['ranking-chart'],

  resizeWidthSensitive: true,
  resizeHeightSensitive: true,

  data: [],
  column: '',
  rank: 0,
  ranked: null,
  unit: '',
  numeral_format: '0.0',

  colors: {
    gray: '#a8a8a8',
    web_safe_orange: '#a24c0e',
    dcp_orange: '#de7d2c',
    curr: '#60acbf',
  },

  height: 50,
  margin: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },

  didInsertElement() {
    const el = this.$();
    const elWidth = el.width();
    const margin = this.get('margin');
    const height = this.get('height') - margin.top - margin.bottom;
    const width = elWidth - margin.left - margin.right;

    let svg = select(el.get(0))
      .append('svg')
      .attr('class', 'chart')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    let bars = svg.append('g')
      .attr('class', 'bars');

    let curr = svg.append('g')
      .attr('class', 'curr');

    let moes = svg.append('g')
      .attr('class', 'moes');

    let masks = svg.append('g')
      .attr('class', 'masks');

    let div = select(el.get(0))
      .append('div')
      .attr('class', 'tooltip')
      .attr('style', 'opacity: 1;');

    this.set('svg', svg);
    this.set('div', div);
    this.set('bars', bars);
    this.set('moes', moes);
    this.set('masks', masks);
    this.set('curr', curr);

    this._super(...arguments);
  },

  debouncedDidResize(width, height, evt) {
    this.didRender();
  },

  drawChart(el, data) {
    const elWidth = el.width();

    const margin = this.get('margin');
    const height = this.get('height') - margin.top - margin.bottom;
    const width = elWidth - margin.left - margin.right;
    const colorsHash = this.get('colors');
    const column = this.get('column');
    const overlayColumn = this.get('overlayColumn');
    const moe = this.get('moe');
    const rank = data.findIndex(d => d.is_selected);
    const unit = this.get('unit');
    const current = data[rank];
    if(!data[0][column]) return;

    const { svg, div, bars, masks, moes, curr } =
      this.getProperties('svg', 'div', 'bars', 'masks', 'moes', 'curr');

    div
      .attr('class', 'tooltip');

    svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    const x = scaleBand()
      .domain(data.map(d => d.borocd))
      .range([0, width])
      .padding(0);

    const y = scaleLinear()
      .domain([0, max(data, d => (d[column] + (d[moe] || 0)))])
      .range([0, height]);

    const moeColor = '#6eceff';
    const numeral_format = this.get('numeral_format');

    const colors = (d) => {
      return d.is_selected ? colorsHash.web_safe_orange : colorsHash.gray;
    };

    const currColors = (d) => {
      return d.is_selected ? colorsHash.web_safe_orange : colorsHash.curr;
    };

    const calculateMidpoint = (node) => {
      return (node.getBoundingClientRect().width / 2) - Math.floor((x.bandwidth() / 2));
    };

    const tooltipTemplate = this.get('tooltip').bind(this, current);

    const handleMouseOver = (d, i) => {
      const selector = `.bar-${d.borocd}`;
      const overlay = `.bar-curr-${d.borocd}`;

      svg.select(selector)
        .transition()
        .duration(10)
        .attr('fill', colorsHash.dcp_orange);

      svg.select(overlay)
        .attr('opacity', 0);

      div
        .html(function() {
          return tooltipTemplate(d)
        })
        .attr('style', function() {
          const midpoint = calculateMidpoint(this);
          return `left: ${x(d.borocd) - midpoint}px`;
        });
    };

    const handleMouseOut = (d, i) => {
      const selector = `.bar-${d.borocd}`;
      const overlay = `.bar-curr-${d.borocd}`;

      svg.select(selector)
        .transition()
        .duration(10)
        .attr('fill', function (d) {
          return d.is_selected ? colorsHash.web_safe_orange : colorsHash.gray;
        });

      svg.select(overlay)
        .attr('opacity', 1);
    };

    // Join new data
    const theseBars = bars
      .selectAll('.bar')
      .data(data, function (d) {
        return d.borocd;
      });

    const theseMoes = moes
      .selectAll('.moe')
      .data(data, function (d) {
        return d.borocd;
      });

    const theseMasks = masks
      .selectAll('.mask')
      .data(data, function (d) {
        return d.borocd;
      });

    const theseCurr = curr
      .selectAll('.curr')
      .data(data, function (d) {
        return d.borocd;
      });

    // update elements
    theseBars
      .attr('fill', colors)
      .attr('width', () => x.bandwidth() - 2)
      .attr('x', d => x(d.borocd));

    theseMasks
      .attr('width', x.bandwidth())
      .attr('x', d => x(d.borocd))
      .on('mouseover', handleMouseOver)
      .on('mouseout', handleMouseOut);

    theseBars.enter()
      .append('rect')
      .attr('class', (d, i) => `bar bar-${d.borocd} bar-index-${i}`)
      .attr('fill', colors)
      .attr('y', d => height - y(d[column]))
      .attr('width', d => x.bandwidth() - 2)
      .attr('x', d => x(d.borocd))
      .attr('height', d => y(d[column]));

    theseMasks.enter()
      .append('rect')
      .attr('class', 'mask')
      .attr('opacity', 0)
      .attr('y', 0)
      .attr('width', x.bandwidth())
      .attr('x', d => x(d.borocd))
      .attr('height', height)
      .on('mouseover', handleMouseOver)
      .on('mouseout', handleMouseOut);

    if(overlayColumn) {
      theseCurr
        .attr('fill', currColors)
        .attr('width', () => x.bandwidth() - 2)
        .attr('x', d => x(d.borocd));

      theseCurr.enter()
        .append('rect')
        .attr('class', (d, i) => `bar curr bar-curr-${d.borocd} bar-index-${i}`)
        .attr('fill', currColors)
        .attr('style', 'pointer-events: none;')
        .attr('y', d => height - y(d[overlayColumn]))
        .attr('width', d => x.bandwidth() - 2)
        .attr('x', d => x(d.borocd))
        .attr('height', d => y(d[overlayColumn]));
    }

    if(moe) {
      theseMoes
        .attr('fill', moeColor)
        .attr('width', () => x.bandwidth() - 2)
        .attr('x', d => x(d.borocd));

      theseMoes.enter()
        .append('rect')
        .attr('class', (d, i) => `bar moe bar-${d.borocd} bar-index-${i}`)
        .style('opacity', '0.5')
        .attr('fill', moeColor)
        .attr('y', d => height - (y(d[column]) + y(d[moe])))
        .attr('width', d => x.bandwidth() - 2)
        .attr('x', d => x(d.borocd))
        .attr('height', d => y(d[moe]) * 2);
    }

    div
      .html(tooltipTemplate)
      .attr('style', function () {
        const midpoint = calculateMidpoint(this);
        return `left: ${x(current.borocd) - midpoint}px`;
      });

    svg
      .on('mouseout', function() {
        div
          .html(tooltipTemplate)
          .attr('style', function() {
            const midpoint = calculateMidpoint(this);
            return `left: ${x(current.borocd) - midpoint}px`;
          });
      });

    this.setProperties({
      x,
      y,
      handleMouseOut,
      handleMouseOver,
    });
  },

  didRender() {
    const dataPromise = this.get('data');
    const el = this.$();
    Promise.resolve(dataPromise).then(this.drawChart.bind(this, el));
  },
});
