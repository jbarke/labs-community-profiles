import { isBlank } from '@ember/utils';
import { A } from '@ember/array';
import { computed, get } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import { Promise } from 'rsvp';
import { task, timeout } from 'ember-concurrency';
import { defaultMatcher} from 'ember-power-select/utils/group-utils';

const DEBOUNCE_MS = 200;

export default Component.extend({
  store: service(),
  searchTerms: '',
  placeholder: 'Search',
  options: computed('model', 'addresses', 'searchTerms', function() {
    const districts = this.get('model');
    const addressesPromise = this.get('addresses');
    const stream = A();
    return addressesPromise.then(addresses => {
      stream
        .pushObjects(districts.toArray())
        .pushObjects(addresses.toArray());

      return stream;
    });
  }),
  addresses: computed('searchTerms', function() {
    const terms = this.get('searchTerms') || {};

    return this.get('store').query('address', terms);
  }),
  debounceTerms: task(function* (terms) {
    if (isBlank(terms)) { return []; }

    yield timeout(DEBOUNCE_MS);
    yield this.set('searchTerms', terms);
  }).restartable(),

  matcher(value, searchTerm) {
    if (get(value, 'constructor.modelName') === 'address') {
      return true;
    }

    return defaultMatcher(get(value, 'name'), searchTerm);
  },

  actions: {
    handleSearch(terms, dropdownState) {
      this.get('debounceTerms').perform(terms);
    },
  },
});

