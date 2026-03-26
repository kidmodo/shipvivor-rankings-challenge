const os = require('node:os');
const path = require('node:path');

const CASTAWAYS = [
  { id: 'angelina-keeley', name: 'Angelina Keeley', image: 'assets/cast/angelina-keeley.jpg' },
  { id: 'aubry-bracco', name: 'Aubry Bracco', image: 'assets/cast/aubry-bracco.jpg' },
  { id: 'benjamin-coach-wade', name: 'Benjamin "Coach" Wade', image: 'assets/cast/benjamin-coach-wade.jpg' },
  { id: 'charlie-davis', name: 'Charlie Davis', image: 'assets/cast/charlie-davis.jpg' },
  { id: 'chrissy-hofbeck', name: 'Chrissy Hofbeck', image: 'assets/cast/chrissy-hofbeck.jpg' },
  { id: 'christian-hubicki', name: 'Christian Hubicki', image: 'assets/cast/christian-hubicki.jpg' },
  { id: 'cirie-fields', name: 'Cirie Fields', image: 'assets/cast/cirie-fields.jpg' },
  { id: 'colby-donaldson', name: 'Colby Donaldson', image: 'assets/cast/colby-donaldson.jpg' },
  { id: 'dee-valladares', name: 'Dee Valladares', image: 'assets/cast/dee-valladares.jpg' },
  { id: 'emily-flippen', name: 'Emily Flippen', image: 'assets/cast/emily-flippen.jpg' },
  { id: 'genevieve-mushaluk', name: 'Genevieve Mushaluk', image: 'assets/cast/genevieve-mushaluk.jpg' },
  { id: 'jenna-lewis-dougherty', name: 'Jenna Lewis-Dougherty', image: 'assets/cast/jenna-lewis-dougherty.jpg' },
  { id: 'joe-hunter', name: 'Joe Hunter', image: 'assets/cast/joe-hunter.jpg' },
  { id: 'jonathan-young', name: 'Jonathan Young', image: 'assets/cast/jonathan-young.jpg' },
  { id: 'kamilla-karthigesu', name: 'Kamilla Karthigesu', image: 'assets/cast/kamilla-karthigesu.jpg' },
  { id: 'kyle-fraser', name: 'Kyle Fraser', image: 'assets/cast/kyle-fraser.jpg' },
  { id: 'mike-white', name: 'Mike White', image: 'assets/cast/mike-white.jpg' },
  { id: 'ozzy-lusth', name: 'Ozzy Lusth', image: 'assets/cast/ozzy-lusth.jpg' },
  { id: 'q-burdette', name: 'Q Burdette', image: 'assets/cast/q-burdette.jpg' },
  { id: 'rick-devens', name: 'Rick Devens', image: 'assets/cast/rick-devens.jpg' },
  { id: 'rizo-velovic', name: 'Rizo Velovic', image: 'assets/cast/rizo-velovic.jpg' },
  { id: 'savannah-louie', name: 'Savannah Louie', image: 'assets/cast/savannah-louie.jpg' },
  { id: 'stephenie-lagrossa-kendrick', name: 'Stephenie LaGrossa Kendrick', image: 'assets/cast/stephenie-lagrossa-kendrick.jpg' },
  { id: 'tiffany-ervin', name: 'Tiffany Ervin', image: 'assets/cast/tiffany-ervin.jpg' }
];

const CAST_IDS = CASTAWAYS.map((castaway) => castaway.id);
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;
const LOCAL_DB_PATH = path.join(os.tmpdir(), 'shipvivor-local-db.json');
const LOCAL_BACKGROUND_IMAGE_PATH = path.join(os.tmpdir(), 'shipvivor-background-image.txt');
const BLOB_STORE_NAME = 'shipvivor-db';
const BLOB_STATE_KEY = 'state';
const BACKGROUND_IMAGE_BLOB_KEY_PREFIX = 'background-image-v';
const NO_SCORE_WEEKS = new Set([1]);
const LEGACY_SCORE_WEEK = 2;
const SCALED_SCORE_START_WEEK = 3;
const SCALED_SCORE_BASE_CAP = 22;
const SCALED_SCORE_ALPHA = 0.7;
const LOCKED_WEEK_ONE_ELIMINATIONS = new Set(['kyle-fraser', 'jenna-lewis-dougherty']);
const MAX_CHAT_MESSAGES = 250;
const MAX_NOTE_LENGTH = 700;
const MAX_RECAP_LENGTH = 2400;
const MAX_RECAP_TITLE_LENGTH = 120;
const MAX_WINNER_PICKS = 3;
const MAX_BIRTH_NAME_LENGTH = 80;
const LOCK_ANCHOR_WEEK = 3;
const LOCK_ANCHOR_UTC_MS = Date.UTC(2026, 2, 12, 0, 0, 0);
const WEEK_MS = 1000 * 60 * 60 * 24 * 7;
const TRIBE_KEYS = ['vatu', 'cila', 'kalo', 'merge'];
const USER_AFFILIATION_KEYS = ['', 'minecraft', 'college', 'chrisblue'];
const DEFAULT_TRIBE_BY_ID = {
  'angelina-keeley': 'vatu',
  'aubry-bracco': 'vatu',
  'colby-donaldson': 'vatu',
  'genevieve-mushaluk': 'vatu',
  'kyle-fraser': 'vatu',
  'q-burdette': 'vatu',
  'rizo-velovic': 'vatu',
  'stephenie-lagrossa-kendrick': 'vatu',
  'christian-hubicki': 'cila',
  'cirie-fields': 'cila',
  'emily-flippen': 'cila',
  'jenna-lewis-dougherty': 'cila',
  'joe-hunter': 'cila',
  'ozzy-lusth': 'cila',
  'rick-devens': 'cila',
  'savannah-louie': 'cila',
  'benjamin-coach-wade': 'kalo',
  'charlie-davis': 'kalo',
  'chrissy-hofbeck': 'kalo',
  'dee-valladares': 'kalo',
  'jonathan-young': 'kalo',
  'kamilla-karthigesu': 'kalo',
  'mike-white': 'kalo',
  'tiffany-ervin': 'kalo'
};

module.exports = {
  BLOB_STATE_KEY,
  BACKGROUND_IMAGE_BLOB_KEY_PREFIX,
  BLOB_STORE_NAME,
  CASTAWAYS,
  CAST_IDS,
  DEFAULT_TRIBE_BY_ID,
  LEGACY_SCORE_WEEK,
  LOCAL_DB_PATH,
  LOCAL_BACKGROUND_IMAGE_PATH,
  LOCK_ANCHOR_UTC_MS,
  LOCK_ANCHOR_WEEK,
  LOCKED_WEEK_ONE_ELIMINATIONS,
  MAX_BIRTH_NAME_LENGTH,
  MAX_CHAT_MESSAGES,
  MAX_NOTE_LENGTH,
  MAX_RECAP_LENGTH,
  MAX_RECAP_TITLE_LENGTH,
  MAX_WINNER_PICKS,
  NO_SCORE_WEEKS,
  SCALED_SCORE_ALPHA,
  SCALED_SCORE_BASE_CAP,
  SCALED_SCORE_START_WEEK,
  SESSION_MAX_AGE_MS,
  TRIBE_KEYS,
  USER_AFFILIATION_KEYS,
  WEEK_MS
};
