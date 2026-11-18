'use strict';

const VerbAnswers = (() => {
  const simple = {
    'indicatif-present': 'P',
    imparfait: 'I',
    'futur-simple': 'F',
    'conditionnel-present': 'C',
    'subjonctif-present': 'S',
  };
  const compounds = {
    'passe-compose': 'P',
    'plus-que-parfait': 'I',
    'futur-anterieur': 'F',
    'conditionnel-passe': 'C',
    'subjonctif-passe': 'S',
  };
  // The course draws verbs without a direct object, including monter, descendre and sortir.
  const etreVerbs = new Set([
    'aller', 'descendre', 'devenir', 'intervenir', 'monter', 'mourir',
    'naitre', 'parvenir', 'partir', 'sortir', 'venir',
  ]);
  const invariantReflexives = new Set(['se plaire', 'se rappeler']);
  const reflexivePronouns = ['me', 'te', 'se', 'nous', 'vous', 'se'];
  const stressedReflexives = { 1: 'toi', 3: 'nous', 4: 'vous' };
  const agreement = [
    ['je', 0, 2], ['tu', 0, 2], ['il', 0], ['nous', 1, 3], ['vous', 1, 3], ['ils', 1],
  ];
  const recent = ['viens', 'viens', 'vient', 'venons', 'venez', 'viennent'];
  const asseoir = {
    P: ['assieds', 'assieds', 'assied', 'asseyons', 'asseyez', 'asseyent'],
    I: ['asseyais', 'asseyais', 'asseyait', 'asseyions', 'asseyiez', 'asseyaient'],
    F: ['assiérai', 'assiéras', 'assiéra', 'assiérons', 'assiérez', 'assiéront'],
    C: ['assiérais', 'assiérais', 'assiérait', 'assiérions', 'assiériez', 'assiéraient'],
    S: ['asseye', 'asseyes', 'asseye', 'asseyions', 'asseyiez', 'asseyent'],
    Y: [null, 'assieds', null, 'asseyons', 'asseyez', null],
  };
  const vowelStart = /^[aàâäæeéèêëiîïoôöœuùûüyh]/iu;
  const distinct = entries => [...new Set(entries)];

  function link(left, right, aspiratedH = false) {
    if (['je', 'me', 'te', 'se', 'que', 'de'].includes(left) &&
        vowelStart.test(right) && !(aspiratedH && /^h/i.test(right))) {
      return left.slice(0, -1) + '’' + right;
    }
    return left + ' ' + right;
  }
  function assignPerson(person, impersonal) {
    const [subject, ...forms] = agreement[person];
    if (person === 2 && !impersonal) return [['il', [0]], ['elle', [2]]];
    if (person === 5 && !impersonal) return [['ils', [1]], ['elles', [3]]];
    return [[subject, forms]];
  }
  function answer(lexicon, {word, person, tense, impersonal}) {
    if (!Number.isInteger(person) || person < 0 || person > 5) return null;
    const reflexive = /^(se |s’)/u.test(word);
    const bare = word.replace(/^(se |s’)/u, '');
    const [stem, complement] = bare.split(' ');
    const table = Object.hasOwn(lexicon, stem) ? lexicon[stem] : null;
    if (!table) return null;
    const hasAspiratedH = stem === 'haïr';
    const subjonctif = tense.startsWith('subjonctif-');
    const rows = assignPerson(person, impersonal);
    const suffix = complement ? ' ' + complement + '…' : '';
    const inflectedReflexive = (text, aspirated = false) =>
      reflexive ? link(reflexivePronouns[person], text, aspirated) : text;
    const buildPhrase = (subject, text, aspirated = false) => {
      const phrase = link(subject, text, aspirated);
      return (subjonctif ? link('que', phrase) : phrase) + suffix;
    };
    const simpleCode = simple[tense];
    if (simpleCode || tense === 'imperatif') {
      const code = simpleCode || 'Y';
      const form = table[code]?.[person];
      if (!form) return null;
      const extra = stem === 'asseoir' ? asseoir[code]?.[person] : null;
      const forms = distinct([form, extra].filter(Boolean));
      const lines = forms.flatMap(value => {
        if (code === 'Y') return [value + (reflexive ? '-' + stressedReflexives[person] : '') + suffix];
        return rows.map(([subject]) => buildPhrase(subject, inflectedReflexive(value, hasAspiratedH), hasAspiratedH));
      });
      return {lines};
    }
    if (tense === 'passe-recent' || tense === 'futur-proche') {
      const infinitive = inflectedReflexive(stem, hasAspiratedH);
      const phrase = tense === 'passe-recent'
        ? recent[person] + ' ' + link('de', infinitive, hasAspiratedH && !reflexive)
        : lexicon.aller.P[person] + ' ' + infinitive;
      return {lines: rows.map(([subject]) => buildPhrase(subject, phrase))};
    }
    if (!Object.hasOwn(compounds, tense) || !table.K?.[0]) return null;
    const command = compounds[tense];
    const auxiliary = reflexive || etreVerbs.has(stem) ? 'être' : 'avoir';
    const helper = lexicon[auxiliary][command][person];
    const agree = auxiliary === 'être' && !invariantReflexives.has(word);
    const lines = rows.flatMap(([subject, indexes]) => {
      const forms = agree ? indexes.map(index => table.K[index]).filter(Boolean) : [table.K[0]];
      return distinct(forms).map(form => buildPhrase(subject, inflectedReflexive(helper + ' ' + form)));
    });
    return {lines};
  }

  return { answer };
})();

// Make the same implementation available to the local validation script.
if (typeof module === 'object') module.exports = VerbAnswers;
