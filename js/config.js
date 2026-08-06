// Site-wide configuration.
window.PCHIP_CONFIG = {
  CSV_URL:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vR5NHq_4AWENHz8I_GLpeSbdvF7G-GphFSc65shaFkEsvjQxo-2p-fEgoGvHRK73sceWRMjTSsZWh0K/pub?gid=1214506223&single=true&output=csv",

  SOLDIER_FIELD: {
    name: "Soldier Field",
    address: "1410 Special Olympics Dr, Chicago, IL 60605",
  },

  MAP_CENTER: [41.8339, -87.7319],
  MAP_INITIAL_ZOOM: 11,

  // Matches the CSS breakpoint that switches the layout to mobile; also used
  // to decide popup-vs-slide-panel on marker tap.
  MOBILE_MAX_WIDTH: 860,
};
