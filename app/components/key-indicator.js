import Component from '@ember/component';
import { computed } from '@ember/object';
import { ChildMixin } from 'ember-composability-tools';

export default Component.extend({
  borocd: '',
  column: '',
  data: [],
  unit: '',
  numeral_format: '0.0',

  sortedData: computed('data', 'borocd', function() {
    const borocd = this.get('borocd');
    return this.get('data').then(data => {
      return data.sortBy(`${this.get('column')}`).reverse().map(d => {
        d.is_selected = (borocd === d.borocd) ? true : false;
        return d;
      });
    });
  }),
});
