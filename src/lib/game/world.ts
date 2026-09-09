import type { TerritoryDef } from "./types";
import { CAPITOL } from "./types";

export const WORLD_W = 1680;
export const WORLD_H = 1260;

export const TERRITORIES: TerritoryDef[] = [
  {
    "id": "amundsen",
    "name": "Firn",
    "continent": "at",
    "coastal": false,
    "path": "M1000.8,1054.2L1000.8,1087.8L971.7,1104.7L942.5,1087.8L942.5,1054.2L971.7,1037.3Z",
    "labelX": 971.7,
    "labelY": 1071.0
  },
  {
    "id": "siple",
    "name": "Berg",
    "continent": "at",
    "coastal": true,
    "path": "M1030.3,1003.2L1030.3,1036.8L1001.1,1053.7L972.0,1036.8L972.0,1003.2L1001.1,986.3Z",
    "labelX": 1001.1,
    "labelY": 1020.0
  },
  {
    "id": "getz",
    "name": "Tongue",
    "continent": "at",
    "coastal": true,
    "path": "M883.1,1054.2L883.1,1087.8L853.9,1104.7L824.8,1087.8L824.8,1054.2L853.9,1037.3Z",
    "labelX": 853.9,
    "labelY": 1071.0
  },
  {
    "id": "byrd",
    "name": "Stream",
    "continent": "at",
    "coastal": false,
    "path": "M971.4,1105.2L971.4,1138.8L942.2,1155.7L913.1,1138.8L913.1,1105.2L942.2,1088.3Z",
    "labelX": 942.2,
    "labelY": 1122.0
  },
  {
    "id": "weddell",
    "name": "Floe",
    "continent": "at",
    "coastal": true,
    "path": "M618.0,1003.2L618.0,1036.8L588.9,1053.7L559.7,1036.8L559.7,1003.2L588.9,986.3Z",
    "labelX": 588.9,
    "labelY": 1020.0
  },
  {
    "id": "berkner",
    "name": "Pack",
    "continent": "at",
    "coastal": true,
    "path": "M971.4,1003.2L971.4,1036.8L942.2,1053.7L913.1,1036.8L913.1,1003.2L942.2,986.3Z",
    "labelX": 942.2,
    "labelY": 1020.0
  },
  {
    "id": "ross",
    "name": "Sound",
    "continent": "at",
    "coastal": true,
    "path": "M1059.7,1156.2L1059.7,1189.8L1030.6,1206.7L1001.4,1189.8L1001.4,1156.2L1030.6,1139.3Z",
    "labelX": 1030.6,
    "labelY": 1173.0
  },
  {
    "id": "oates",
    "name": "Grounding",
    "continent": "at",
    "coastal": true,
    "path": "M1089.2,1105.2L1089.2,1138.8L1060.0,1155.7L1030.9,1138.8L1030.9,1105.2L1060.0,1088.3Z",
    "labelX": 1060.0,
    "labelY": 1122.0
  },
  {
    "id": "vinson",
    "name": "Nunatak",
    "continent": "at",
    "coastal": true,
    "path": "M824.2,1054.2L824.2,1087.8L795.0,1104.7L765.9,1087.8L765.9,1054.2L795.0,1037.3Z",
    "labelX": 795.0,
    "labelY": 1071.0
  },
  {
    "id": "filchner",
    "name": "Shelf",
    "continent": "at",
    "coastal": true,
    "path": "M853.6,1003.2L853.6,1036.8L824.5,1053.7L795.3,1036.8L795.3,1003.2L824.5,986.3Z",
    "labelX": 824.5,
    "labelY": 1020.0
  },
  {
    "id": "enderby",
    "name": "Dome",
    "continent": "at",
    "coastal": false,
    "path": "M941.9,1054.2L941.9,1087.8L912.8,1104.7L883.6,1087.8L883.6,1054.2L912.8,1037.3Z",
    "labelX": 912.8,
    "labelY": 1071.0
  },
  {
    "id": "ellsworth",
    "name": "Rise",
    "continent": "at",
    "coastal": true,
    "path": "M941.9,1156.2L941.9,1189.8L912.8,1206.7L883.6,1189.8L883.6,1156.2L912.8,1139.3Z",
    "labelX": 912.8,
    "labelY": 1173.0
  },
  {
    "id": "thurston",
    "name": "Drift",
    "continent": "at",
    "coastal": true,
    "path": "M794.7,1105.2L794.7,1138.8L765.6,1155.7L736.4,1138.8L736.4,1105.2L765.6,1088.3Z",
    "labelX": 765.6,
    "labelY": 1122.0
  },
  {
    "id": "pennell",
    "name": "Serac",
    "continent": "at",
    "coastal": true,
    "path": "M1059.7,1054.2L1059.7,1087.8L1030.6,1104.7L1001.4,1087.8L1001.4,1054.2L1030.6,1037.3Z",
    "labelX": 1030.6,
    "labelY": 1071.0
  },
  {
    "id": "dufek",
    "name": "Crevasse",
    "continent": "at",
    "coastal": false,
    "path": "M1030.3,1105.2L1030.3,1138.8L1001.1,1155.7L972.0,1138.8L972.0,1105.2L1001.1,1088.3Z",
    "labelX": 1001.1,
    "labelY": 1122.0
  },
  {
    "id": "asgard",
    "name": "Asgard",
    "continent": "at",
    "coastal": true,
    "path": "M912.5,1105.2L912.5,1138.8L883.3,1155.7L854.2,1138.8L854.2,1105.2L883.3,1088.3Z",
    "labelX": 883.3,
    "labelY": 1122.0
  },
  {
    "id": "adelie",
    "name": "Front",
    "continent": "at",
    "coastal": true,
    "path": "M1000.8,1156.2L1000.8,1189.8L971.7,1206.7L942.5,1189.8L942.5,1156.2L971.7,1139.3Z",
    "labelX": 971.7,
    "labelY": 1173.0
  },
  {
    "id": "maud",
    "name": "Rime",
    "continent": "at",
    "coastal": true,
    "path": "M912.5,1003.2L912.5,1036.8L883.3,1053.7L854.2,1036.8L854.2,1003.2L883.3,986.3Z",
    "labelX": 883.3,
    "labelY": 1020.0
  },
  {
    "id": "shirase",
    "name": "Polynya",
    "continent": "at",
    "coastal": true,
    "path": "M1148.1,1105.2L1148.1,1138.8L1118.9,1155.7L1089.8,1138.8L1089.8,1105.2L1118.9,1088.3Z",
    "labelX": 1118.9,
    "labelY": 1122.0
  },
  {
    "id": "ronne",
    "name": "Barrier",
    "continent": "at",
    "coastal": true,
    "path": "M735.8,1105.2L735.8,1138.8L706.7,1155.7L677.5,1138.8L677.5,1105.2L706.7,1088.3Z",
    "labelX": 706.7,
    "labelY": 1122.0
  },
  {
    "id": "prairie",
    "name": "Grass Sea",
    "continent": "nw",
    "coastal": true,
    "path": "M323.6,187.2L323.6,220.8L294.4,237.7L265.3,220.8L265.3,187.2L294.4,170.3Z",
    "labelX": 294.4,
    "labelY": 204.0
  },
  {
    "id": "aleut",
    "name": "Ice Chain",
    "continent": "nw",
    "coastal": true,
    "path": "M353.0,136.2L353.0,169.8L323.9,186.7L294.7,169.8L294.7,136.2L323.9,119.3Z",
    "labelX": 323.9,
    "labelY": 153.0
  },
  {
    "id": "greenland",
    "name": "Ice Cap",
    "continent": "nw",
    "coastal": false,
    "path": "M441.4,289.2L441.4,322.8L412.2,339.7L383.1,322.8L383.1,289.2L412.2,272.3Z",
    "labelX": 412.2,
    "labelY": 306.0
  },
  {
    "id": "keewatin",
    "name": "Timberline",
    "continent": "nw",
    "coastal": true,
    "path": "M294.2,238.2L294.2,271.8L265.0,288.7L235.9,271.8L235.9,238.2L265.0,221.3Z",
    "labelX": 265.0,
    "labelY": 255.0
  },
  {
    "id": "yukon",
    "name": "Alaska",
    "continent": "nw",
    "coastal": true,
    "path": "M176.4,238.2L176.4,271.8L147.2,288.7L118.1,271.8L118.1,238.2L147.2,221.3Z",
    "labelX": 147.2,
    "labelY": 255.0
  },
  {
    "id": "ontario",
    "name": "Pine Shore",
    "continent": "nw",
    "coastal": true,
    "path": "M559.2,187.2L559.2,220.8L530.0,237.7L500.9,220.8L500.9,187.2L530.0,170.3Z",
    "labelX": 530.0,
    "labelY": 204.0
  },
  {
    "id": "labrador",
    "name": "Spruce",
    "continent": "nw",
    "coastal": true,
    "path": "M441.4,85.2L441.4,118.8L412.2,135.7L383.1,118.8L383.1,85.2L412.2,68.3Z",
    "labelX": 412.2,
    "labelY": 102.0
  },
  {
    "id": "dakota",
    "name": "West Ice",
    "continent": "nw",
    "coastal": true,
    "path": "M88.0,187.2L88.0,220.8L58.9,237.7L29.7,220.8L29.7,187.2L58.9,170.3Z",
    "labelX": 58.9,
    "labelY": 204.0
  },
  {
    "id": "laurentide",
    "name": "High Ice",
    "continent": "nw",
    "coastal": true,
    "path": "M382.5,85.2L382.5,118.8L353.3,135.7L324.2,118.8L324.2,85.2L353.3,68.3Z",
    "labelX": 353.3,
    "labelY": 102.0
  },
  {
    "id": "columbia",
    "name": "Tundra",
    "continent": "nw",
    "coastal": true,
    "path": "M294.2,136.2L294.2,169.8L265.0,186.7L235.9,169.8L235.9,136.2L265.0,119.3Z",
    "labelX": 265.0,
    "labelY": 153.0
  },
  {
    "id": "helluland",
    "name": "Ice Shore",
    "continent": "ne",
    "coastal": true,
    "path": "M382.5,289.2L382.5,322.8L353.3,339.7L324.2,322.8L324.2,289.2L353.3,272.3Z",
    "labelX": 353.3,
    "labelY": 306.0
  },
  {
    "id": "cordillera",
    "name": "Ice Range",
    "continent": "nw",
    "coastal": false,
    "path": "M411.9,136.2L411.9,169.8L382.8,186.7L353.6,169.8L353.6,136.2L382.8,119.3Z",
    "labelX": 382.8,
    "labelY": 153.0
  },
  {
    "id": "beringia",
    "name": "Ice Bridge",
    "continent": "nw",
    "coastal": true,
    "path": "M146.9,187.2L146.9,220.8L117.8,237.7L88.6,220.8L88.6,187.2L117.8,170.3Z",
    "labelX": 117.8,
    "labelY": 204.0
  },
  {
    "id": "rockies",
    "name": "High Peak",
    "continent": "nw",
    "coastal": true,
    "path": "M235.3,238.2L235.3,271.8L206.1,288.7L177.0,271.8L177.0,238.2L206.1,221.3Z",
    "labelX": 206.1,
    "labelY": 255.0
  },
  {
    "id": "acadia",
    "name": "Muskeg",
    "continent": "nw",
    "coastal": false,
    "path": "M500.3,187.2L500.3,220.8L471.1,237.7L442.0,220.8L442.0,187.2L471.1,170.3Z",
    "labelX": 471.1,
    "labelY": 204.0
  },
  {
    "id": "hudson",
    "name": "Cold Fen",
    "continent": "nw",
    "coastal": false,
    "path": "M470.8,238.2L470.8,271.8L441.7,288.7L412.5,271.8L412.5,238.2L441.7,221.3Z",
    "labelX": 441.7,
    "labelY": 255.0
  },
  {
    "id": "baffin",
    "name": "River Bend",
    "continent": "ne",
    "coastal": true,
    "path": "M588.6,238.2L588.6,271.8L559.5,288.7L530.3,271.8L530.3,238.2L559.5,221.3Z",
    "labelX": 559.5,
    "labelY": 255.0
  },
  {
    "id": "cascades",
    "name": "Cascade",
    "continent": "nw",
    "coastal": true,
    "path": "M205.8,289.2L205.8,322.8L176.7,339.7L147.5,322.8L147.5,289.2L176.7,272.3Z",
    "labelX": 176.7,
    "labelY": 306.0
  },
  {
    "id": "mackenzie",
    "name": "Cold River",
    "continent": "nw",
    "coastal": true,
    "path": "M323.6,289.2L323.6,322.8L294.4,339.7L265.3,322.8L265.3,289.2L294.4,272.3Z",
    "labelX": 294.4,
    "labelY": 306.0
  },
  {
    "id": "appalachia",
    "name": "Long Ridge",
    "continent": "nw",
    "coastal": true,
    "path": "M117.5,238.2L117.5,271.8L88.3,288.7L59.2,271.8L59.2,238.2L88.3,221.3Z",
    "labelX": 88.3,
    "labelY": 255.0
  },
  {
    "id": "markland",
    "name": "Stone Hill",
    "continent": "ne",
    "coastal": false,
    "path": "M441.4,187.2L441.4,220.8L412.2,237.7L383.1,220.8L383.1,187.2L412.2,170.3Z",
    "labelX": 412.2,
    "labelY": 204.0
  },
  {
    "id": "chesapeake",
    "name": "Tide Marsh",
    "continent": "ne",
    "coastal": true,
    "path": "M618.0,85.2L618.0,118.8L588.9,135.7L559.7,118.8L559.7,85.2L588.9,68.3Z",
    "labelX": 588.9,
    "labelY": 102.0
  },
  {
    "id": "huron",
    "name": "Lake Ice",
    "continent": "ne",
    "coastal": true,
    "path": "M735.8,85.2L735.8,118.8L706.7,135.7L677.5,118.8L677.5,85.2L706.7,68.3Z",
    "labelX": 706.7,
    "labelY": 102.0
  },
  {
    "id": "carolina",
    "name": "Moraine",
    "continent": "ne",
    "coastal": false,
    "path": "M706.4,136.2L706.4,169.8L677.2,186.7L648.1,169.8L648.1,136.2L677.2,119.3Z",
    "labelX": 677.2,
    "labelY": 153.0
  },
  {
    "id": "erie",
    "name": "Lake Rim",
    "continent": "ne",
    "coastal": true,
    "path": "M529.7,238.2L529.7,271.8L500.6,288.7L471.4,271.8L471.4,238.2L500.6,221.3Z",
    "labelX": 500.6,
    "labelY": 255.0
  },
  {
    "id": "vinland",
    "name": "Grass Shore",
    "continent": "ne",
    "coastal": false,
    "path": "M411.9,238.2L411.9,271.8L382.8,288.7L353.6,271.8L353.6,238.2L382.8,221.3Z",
    "labelX": 382.8,
    "labelY": 255.0
  },
  {
    "id": "micmac",
    "name": "Pine Bend",
    "continent": "ne",
    "coastal": true,
    "path": "M559.2,85.2L559.2,118.8L530.0,135.7L500.9,118.8L500.9,85.2L530.0,68.3Z",
    "labelX": 530.0,
    "labelY": 102.0
  },
  {
    "id": "winnipeg",
    "name": "Lake Woods",
    "continent": "ne",
    "coastal": true,
    "path": "M676.9,85.2L676.9,118.8L647.8,135.7L618.6,118.8L618.6,85.2L647.8,68.3Z",
    "labelX": 647.8,
    "labelY": 102.0
  },
  {
    "id": "adirondack",
    "name": "High Woods",
    "continent": "ne",
    "coastal": true,
    "path": "M676.9,187.2L676.9,220.8L647.8,237.7L618.6,220.8L618.6,187.2L647.8,170.3Z",
    "labelX": 647.8,
    "labelY": 204.0
  },
  {
    "id": "iroquois",
    "name": "Kettle",
    "continent": "ne",
    "coastal": true,
    "path": "M529.7,136.2L529.7,169.8L500.6,186.7L471.4,169.8L471.4,136.2L500.6,119.3Z",
    "labelX": 500.6,
    "labelY": 153.0
  },
  {
    "id": "muskeg",
    "name": "Ice Bog",
    "continent": "ne",
    "coastal": true,
    "path": "M794.7,85.2L794.7,118.8L765.6,135.7L736.4,118.8L736.4,85.2L765.6,68.3Z",
    "labelX": 765.6,
    "labelY": 102.0
  },
  {
    "id": "ohio",
    "name": "Clay Plain",
    "continent": "ne",
    "coastal": false,
    "path": "M382.5,187.2L382.5,220.8L353.3,237.7L324.2,220.8L324.2,187.2L353.3,170.3Z",
    "labelX": 353.3,
    "labelY": 204.0
  },
  {
    "id": "newfoundland",
    "name": "Cape Wood",
    "continent": "ne",
    "coastal": true,
    "path": "M647.5,136.2L647.5,169.8L618.3,186.7L589.2,169.8L589.2,136.2L618.3,119.3Z",
    "labelX": 618.3,
    "labelY": 153.0
  },
  {
    "id": "nunavut",
    "name": "Meltwater",
    "continent": "ne",
    "coastal": true,
    "path": "M735.8,187.2L735.8,220.8L706.7,237.7L677.5,220.8L677.5,187.2L706.7,170.3Z",
    "labelX": 706.7,
    "labelY": 204.0
  },
  {
    "id": "fundy",
    "name": "Ice Bay",
    "continent": "ne",
    "coastal": true,
    "path": "M765.3,136.2L765.3,169.8L736.1,186.7L707.0,169.8L707.0,136.2L736.1,119.3Z",
    "labelX": 736.1,
    "labelY": 153.0
  },
  {
    "id": "illinois",
    "name": "Oak Shore",
    "continent": "ne",
    "coastal": true,
    "path": "M500.3,85.2L500.3,118.8L471.1,135.7L442.0,118.8L442.0,85.2L471.1,68.3Z",
    "labelX": 471.1,
    "labelY": 102.0
  },
  {
    "id": "nord",
    "name": "Nord",
    "continent": "ne",
    "coastal": false,
    "path": "M353.0,238.2L353.0,271.8L323.9,288.7L294.7,271.8L294.7,238.2L323.9,221.3Z",
    "labelX": 323.9,
    "labelY": 255.0
  },
  {
    "id": "algonquin",
    "name": "Drumlin",
    "continent": "ne",
    "coastal": false,
    "path": "M470.8,136.2L470.8,169.8L441.7,186.7L412.5,169.8L412.5,136.2L441.7,119.3Z",
    "labelX": 441.7,
    "labelY": 153.0
  },
  {
    "id": "mayan",
    "name": "Mist Ridge",
    "continent": "ca",
    "coastal": true,
    "path": "M294.2,544.2L294.2,577.8L265.0,594.7L235.9,577.8L235.9,544.2L265.0,527.3Z",
    "labelX": 265.0,
    "labelY": 561.0
  },
  {
    "id": "sierra",
    "name": "Snow Peak",
    "continent": "nw",
    "coastal": true,
    "path": "M235.3,340.2L235.3,373.8L206.1,390.7L177.0,373.8L177.0,340.2L206.1,323.3Z",
    "labelX": 206.1,
    "labelY": 357.0
  },
  {
    "id": "hawaii",
    "name": "Fire Peak",
    "continent": "ca",
    "coastal": true,
    "path": "M205.8,391.2L205.8,424.8L176.7,441.7L147.5,424.8L147.5,391.2L176.7,374.3Z",
    "labelX": 176.7,
    "labelY": 408.0
  },
  {
    "id": "yucatan",
    "name": "Cenote",
    "continent": "ca",
    "coastal": true,
    "path": "M441.4,391.2L441.4,424.8L412.2,441.7L383.1,424.8L383.1,391.2L412.2,374.3Z",
    "labelX": 412.2,
    "labelY": 408.0
  },
  {
    "id": "olmec",
    "name": "Jade Slope",
    "continent": "ca",
    "coastal": true,
    "path": "M323.6,493.2L323.6,526.8L294.4,543.7L265.3,526.8L265.3,493.2L294.4,476.3Z",
    "labelX": 294.4,
    "labelY": 510.0
  },
  {
    "id": "orinoco",
    "name": "Green Fork",
    "continent": "ca",
    "coastal": true,
    "path": "M411.9,544.2L411.9,577.8L382.8,594.7L353.6,577.8L353.6,544.2L382.8,527.3Z",
    "labelX": 382.8,
    "labelY": 561.0
  },
  {
    "id": "toltec",
    "name": "Rain Coast",
    "continent": "ca",
    "coastal": true,
    "path": "M323.6,391.2L323.6,424.8L294.4,441.7L265.3,424.8L265.3,391.2L294.4,374.3Z",
    "labelX": 294.4,
    "labelY": 408.0
  },
  {
    "id": "tarascan",
    "name": "Caldera",
    "continent": "ca",
    "coastal": false,
    "path": "M294.2,442.2L294.2,475.8L265.0,492.7L235.9,475.8L235.9,442.2L265.0,425.3Z",
    "labelX": 265.0,
    "labelY": 459.0
  },
  {
    "id": "tehuantepec",
    "name": "Isthmus",
    "continent": "ca",
    "coastal": true,
    "path": "M264.7,493.2L264.7,526.8L235.6,543.7L206.4,526.8L206.4,493.2L235.6,476.3Z",
    "labelX": 235.6,
    "labelY": 510.0
  },
  {
    "id": "caribbean",
    "name": "Warm Woods",
    "continent": "ca",
    "coastal": true,
    "path": "M411.9,442.2L411.9,475.8L382.8,492.7L353.6,475.8L353.6,442.2L382.8,425.3Z",
    "labelX": 382.8,
    "labelY": 459.0
  },
  {
    "id": "nicoya",
    "name": "Basalt",
    "continent": "nw",
    "coastal": false,
    "path": "M294.2,340.2L294.2,373.8L265.0,390.7L235.9,373.8L235.9,340.2L265.0,323.3Z",
    "labelX": 265.0,
    "labelY": 357.0
  },
  {
    "id": "arawak",
    "name": "Canopy",
    "continent": "ca",
    "coastal": true,
    "path": "M470.8,442.2L470.8,475.8L441.7,492.7L412.5,475.8L412.5,442.2L441.7,425.3Z",
    "labelX": 441.7,
    "labelY": 459.0
  },
  {
    "id": "maui",
    "name": "Cinder",
    "continent": "ca",
    "coastal": true,
    "path": "M235.3,442.2L235.3,475.8L206.1,492.7L177.0,475.8L177.0,442.2L206.1,425.3Z",
    "labelX": 206.1,
    "labelY": 459.0
  },
  {
    "id": "zapotec",
    "name": "Lava Field",
    "continent": "nw",
    "coastal": false,
    "path": "M264.7,289.2L264.7,322.8L235.6,339.7L206.4,322.8L206.4,289.2L235.6,272.3Z",
    "labelX": 235.6,
    "labelY": 306.0
  },
  {
    "id": "baja",
    "name": "Dry Spine",
    "continent": "ca",
    "coastal": false,
    "path": "M264.7,391.2L264.7,424.8L235.6,441.7L206.4,424.8L206.4,391.2L235.6,374.3Z",
    "labelX": 235.6,
    "labelY": 408.0
  },
  {
    "id": "volcan",
    "name": "Mayan",
    "continent": "ca",
    "coastal": true,
    "path": "M353.0,442.2L353.0,475.8L323.9,492.7L294.7,475.8L294.7,442.2L323.9,425.3Z",
    "labelX": 323.9,
    "labelY": 459.0
  },
  {
    "id": "panama",
    "name": "Grass Gap",
    "continent": "ca",
    "coastal": true,
    "path": "M353.0,544.2L353.0,577.8L323.9,594.7L294.7,577.8L294.7,544.2L323.9,527.3Z",
    "labelX": 323.9,
    "labelY": 561.0
  },
  {
    "id": "patagonia",
    "name": "Wind Steppe",
    "continent": "sa",
    "coastal": true,
    "path": "M470.8,850.2L470.8,883.8L441.7,900.7L412.5,883.8L412.5,850.2L441.7,833.3Z",
    "labelX": 441.7,
    "labelY": 867.0
  },
  {
    "id": "guiana",
    "name": "Wet Woods",
    "continent": "sa",
    "coastal": true,
    "path": "M588.6,646.2L588.6,679.8L559.5,696.7L530.3,679.8L530.3,646.2L559.5,629.3Z",
    "labelX": 559.5,
    "labelY": 663.0
  },
  {
    "id": "chaco",
    "name": "Dry Grass",
    "continent": "sa",
    "coastal": true,
    "path": "M441.4,697.2L441.4,730.8L412.2,747.7L383.1,730.8L383.1,697.2L412.2,680.3Z",
    "labelX": 412.2,
    "labelY": 714.0
  },
  {
    "id": "plata",
    "name": "River Steppe",
    "continent": "sa",
    "coastal": true,
    "path": "M529.7,850.2L529.7,883.8L500.6,900.7L471.4,883.8L471.4,850.2L500.6,833.3Z",
    "labelX": 500.6,
    "labelY": 867.0
  },
  {
    "id": "marajo",
    "name": "Flood Woods",
    "continent": "sa",
    "coastal": false,
    "path": "M559.2,697.2L559.2,730.8L530.0,747.7L500.9,730.8L500.9,697.2L530.0,680.3Z",
    "labelX": 530.0,
    "labelY": 714.0
  },
  {
    "id": "araucania",
    "name": "Warm Grass",
    "continent": "sa",
    "coastal": true,
    "path": "M441.4,595.2L441.4,628.8L412.2,645.7L383.1,628.8L383.1,595.2L412.2,578.3Z",
    "labelX": 412.2,
    "labelY": 612.0
  },
  {
    "id": "pantanal",
    "name": "El Dorado",
    "continent": "sa",
    "coastal": false,
    "path": "M529.7,748.2L529.7,781.8L500.6,798.7L471.4,781.8L471.4,748.2L500.6,731.3Z",
    "labelX": 500.6,
    "labelY": 765.0
  },
  {
    "id": "tocantins",
    "name": "South Grass",
    "continent": "sa",
    "coastal": true,
    "path": "M470.8,952.2L470.8,985.8L441.7,1002.7L412.5,985.8L412.5,952.2L441.7,935.3Z",
    "labelX": 441.7,
    "labelY": 969.0
  },
  {
    "id": "araguaia",
    "name": "River Woods",
    "continent": "sa",
    "coastal": true,
    "path": "M559.2,595.2L559.2,628.8L530.0,645.7L500.9,628.8L500.9,595.2L530.0,578.3Z",
    "labelX": 530.0,
    "labelY": 612.0
  },
  {
    "id": "altiplano",
    "name": "High Salt",
    "continent": "sa",
    "coastal": true,
    "path": "M500.3,799.2L500.3,832.8L471.1,849.7L442.0,832.8L442.0,799.2L471.1,782.3Z",
    "labelX": 471.1,
    "labelY": 816.0
  },
  {
    "id": "andes",
    "name": "High Andes",
    "continent": "sa",
    "coastal": false,
    "path": "M500.3,697.2L500.3,730.8L471.1,747.7L442.0,730.8L442.0,697.2L471.1,680.3Z",
    "labelX": 471.1,
    "labelY": 714.0
  },
  {
    "id": "amazon",
    "name": "Dark Canopy",
    "continent": "sa",
    "coastal": false,
    "path": "M529.7,646.2L529.7,679.8L500.6,696.7L471.4,679.8L471.4,646.2L500.6,629.3Z",
    "labelX": 500.6,
    "labelY": 663.0
  },
  {
    "id": "magellan",
    "name": "Gale Steppe",
    "continent": "sa",
    "coastal": true,
    "path": "M441.4,901.2L441.4,934.8L412.2,951.7L383.1,934.8L383.1,901.2L412.2,884.3Z",
    "labelX": 412.2,
    "labelY": 918.0
  },
  {
    "id": "peninsula",
    "name": "Ice Cape",
    "continent": "sa",
    "coastal": true,
    "path": "M500.3,901.2L500.3,934.8L471.1,951.7L442.0,934.8L442.0,901.2L471.1,884.3Z",
    "labelX": 471.1,
    "labelY": 918.0
  },
  {
    "id": "guapore",
    "name": "River Isle",
    "continent": "sa",
    "coastal": true,
    "path": "M618.0,697.2L618.0,730.8L588.9,747.7L559.7,730.8L559.7,697.2L588.9,680.3Z",
    "labelX": 588.9,
    "labelY": 714.0
  },
  {
    "id": "chubut",
    "name": "Green Bend",
    "continent": "sa",
    "coastal": true,
    "path": "M470.8,646.2L470.8,679.8L441.7,696.7L412.5,679.8L412.5,646.2L441.7,629.3Z",
    "labelX": 441.7,
    "labelY": 663.0
  },
  {
    "id": "atacama",
    "name": "Fog Desert",
    "continent": "sa",
    "coastal": true,
    "path": "M470.8,748.2L470.8,781.8L441.7,798.7L412.5,781.8L412.5,748.2L441.7,731.3Z",
    "labelX": 441.7,
    "labelY": 765.0
  },
  {
    "id": "cerrado",
    "name": "High Grass",
    "continent": "sa",
    "coastal": true,
    "path": "M500.3,595.2L500.3,628.8L471.1,645.7L442.0,628.8L442.0,595.2L471.1,578.3Z",
    "labelX": 471.1,
    "labelY": 612.0
  },
  {
    "id": "pampas",
    "name": "Open Pampa",
    "continent": "sa",
    "coastal": true,
    "path": "M559.2,799.2L559.2,832.8L530.0,849.7L500.9,832.8L500.9,799.2L530.0,782.3Z",
    "labelX": 530.0,
    "labelY": 816.0
  },
  {
    "id": "parana",
    "name": "Grass Flood",
    "continent": "sa",
    "coastal": true,
    "path": "M588.6,748.2L588.6,781.8L559.5,798.7L530.3,781.8L530.3,748.2L559.5,731.3Z",
    "labelX": 559.5,
    "labelY": 765.0
  },
  {
    "id": "dacia",
    "name": "East Tor",
    "continent": "eu",
    "coastal": false,
    "path": "M941.9,340.2L941.9,373.8L912.8,390.7L883.6,373.8L883.6,340.2L912.8,323.3Z",
    "labelX": 912.8,
    "labelY": 357.0
  },
  {
    "id": "helvetia",
    "name": "High Tor",
    "continent": "eu",
    "coastal": true,
    "path": "M941.9,238.2L941.9,271.8L912.8,288.7L883.6,271.8L883.6,238.2L912.8,221.3Z",
    "labelX": 912.8,
    "labelY": 255.0
  },
  {
    "id": "armorica",
    "name": "West Crag",
    "continent": "eu",
    "coastal": true,
    "path": "M794.7,289.2L794.7,322.8L765.6,339.7L736.4,322.8L736.4,289.2L765.6,272.3Z",
    "labelX": 765.6,
    "labelY": 306.0
  },
  {
    "id": "atlas",
    "name": "Atlas",
    "continent": "an",
    "coastal": true,
    "path": "M794.7,391.2L794.7,424.8L765.6,441.7L736.4,424.8L736.4,391.2L765.6,374.3Z",
    "labelX": 765.6,
    "labelY": 408.0
  },
  {
    "id": "carpathian",
    "name": "East Fell",
    "continent": "eu",
    "coastal": true,
    "path": "M824.2,238.2L824.2,271.8L795.0,288.7L765.9,271.8L765.9,238.2L795.0,221.3Z",
    "labelX": 795.0,
    "labelY": 255.0
  },
  {
    "id": "fjords",
    "name": "Fjord",
    "continent": "eu",
    "coastal": false,
    "path": "M1089.2,187.2L1089.2,220.8L1060.0,237.7L1030.9,220.8L1030.9,187.2L1060.0,170.3Z",
    "labelX": 1060.0,
    "labelY": 204.0
  },
  {
    "id": "atlantis",
    "name": "Atlantis",
    "continent": "eu",
    "coastal": true,
    "path": "M1000.8,136.2L1000.8,169.8L971.7,186.7L942.5,169.8L942.5,136.2L971.7,119.3Z",
    "labelX": 971.7,
    "labelY": 153.0
  },
  {
    "id": "liguria",
    "name": "Stone High",
    "continent": "me",
    "coastal": false,
    "path": "M1030.3,391.2L1030.3,424.8L1001.1,441.7L972.0,424.8L972.0,391.2L1001.1,374.3Z",
    "labelX": 1001.1,
    "labelY": 408.0
  },
  {
    "id": "alps",
    "name": "High Scree",
    "continent": "eu",
    "coastal": false,
    "path": "M1059.7,238.2L1059.7,271.8L1030.6,288.7L1001.4,271.8L1001.4,238.2L1030.6,221.3Z",
    "labelX": 1030.6,
    "labelY": 255.0
  },
  {
    "id": "rhine",
    "name": "River Wold",
    "continent": "eu",
    "coastal": false,
    "path": "M912.5,289.2L912.5,322.8L883.3,339.7L854.2,322.8L854.2,289.2L883.3,272.3Z",
    "labelX": 883.3,
    "labelY": 306.0
  },
  {
    "id": "sirte",
    "name": "Dry Tor",
    "continent": "eu",
    "coastal": false,
    "path": "M883.1,340.2L883.1,373.8L853.9,390.7L824.8,373.8L824.8,340.2L853.9,323.3Z",
    "labelX": 853.9,
    "labelY": 357.0
  },
  {
    "id": "lusitania",
    "name": "West Heath",
    "continent": "eu",
    "coastal": true,
    "path": "M912.5,187.2L912.5,220.8L883.3,237.7L854.2,220.8L854.2,187.2L883.3,170.3Z",
    "labelX": 883.3,
    "labelY": 204.0
  },
  {
    "id": "caledonia",
    "name": "Glen",
    "continent": "eu",
    "coastal": true,
    "path": "M1030.3,187.2L1030.3,220.8L1001.1,237.7L972.0,220.8L972.0,187.2L1001.1,170.3Z",
    "labelX": 1001.1,
    "labelY": 204.0
  },
  {
    "id": "noricum",
    "name": "Stone Fell",
    "continent": "eu",
    "coastal": true,
    "path": "M883.1,238.2L883.1,271.8L853.9,288.7L824.8,271.8L824.8,238.2L853.9,221.3Z",
    "labelX": 853.9,
    "labelY": 255.0
  },
  {
    "id": "nile",
    "name": "Reed Delta",
    "continent": "me",
    "coastal": true,
    "path": "M971.4,391.2L971.4,424.8L942.2,441.7L913.1,424.8L913.1,391.2L942.2,374.3Z",
    "labelX": 942.2,
    "labelY": 408.0
  },
  {
    "id": "aquitaine",
    "name": "South Fell",
    "continent": "eu",
    "coastal": true,
    "path": "M824.2,340.2L824.2,373.8L795.0,390.7L765.9,373.8L765.9,340.2L795.0,323.3Z",
    "labelX": 795.0,
    "labelY": 357.0
  },
  {
    "id": "scythia",
    "name": "Steppe Rise",
    "continent": "eu",
    "coastal": false,
    "path": "M853.6,289.2L853.6,322.8L824.5,339.7L795.3,322.8L795.3,289.2L824.5,272.3Z",
    "labelX": 824.5,
    "labelY": 306.0
  },
  {
    "id": "thrace",
    "name": "Warm Downs",
    "continent": "eu",
    "coastal": false,
    "path": "M971.4,289.2L971.4,322.8L942.2,339.7L913.1,322.8L913.1,289.2L942.2,272.3Z",
    "labelX": 942.2,
    "labelY": 306.0
  },
  {
    "id": "bohemia",
    "name": "North High",
    "continent": "me",
    "coastal": false,
    "path": "M1118.6,238.2L1118.6,271.8L1089.5,288.7L1060.3,271.8L1060.3,238.2L1089.5,221.3Z",
    "labelX": 1089.5,
    "labelY": 255.0
  },
  {
    "id": "sahel",
    "name": "Egypt",
    "continent": "an",
    "coastal": true,
    "path": "M1089.2,493.2L1089.2,526.8L1060.0,543.7L1030.9,526.8L1030.9,493.2L1060.0,476.3Z",
    "labelX": 1060.0,
    "labelY": 510.0
  },
  {
    "id": "darfur",
    "name": "Grass Belt",
    "continent": "an",
    "coastal": false,
    "path": "M853.6,493.2L853.6,526.8L824.5,543.7L795.3,526.8L795.3,493.2L824.5,476.3Z",
    "labelX": 824.5,
    "labelY": 510.0
  },
  {
    "id": "awdaghost",
    "name": "Green Hamada",
    "continent": "an",
    "coastal": false,
    "path": "M824.2,442.2L824.2,475.8L795.0,492.7L765.9,475.8L765.9,442.2L795.0,425.3Z",
    "labelX": 795.0,
    "labelY": 459.0
  },
  {
    "id": "kilimanjaro",
    "name": "Snow Cone",
    "continent": "an",
    "coastal": false,
    "path": "M1030.3,493.2L1030.3,526.8L1001.1,543.7L972.0,526.8L972.0,493.2L1001.1,476.3Z",
    "labelX": 1001.1,
    "labelY": 510.0
  },
  {
    "id": "gaetulia",
    "name": "West Erg",
    "continent": "an",
    "coastal": true,
    "path": "M735.8,493.2L735.8,526.8L706.7,543.7L677.5,526.8L677.5,493.2L706.7,476.3Z",
    "labelX": 706.7,
    "labelY": 510.0
  },
  {
    "id": "cyrenaica",
    "name": "Dry Wadi",
    "continent": "an",
    "coastal": false,
    "path": "M794.7,493.2L794.7,526.8L765.6,543.7L736.4,526.8L736.4,493.2L765.6,476.3Z",
    "labelX": 765.6,
    "labelY": 510.0
  },
  {
    "id": "egypt",
    "name": "Flood Plain",
    "continent": "an",
    "coastal": false,
    "path": "M941.9,442.2L941.9,475.8L912.8,492.7L883.6,475.8L883.6,442.2L912.8,425.3Z",
    "labelX": 912.8,
    "labelY": 459.0
  },
  {
    "id": "carthage",
    "name": "West High",
    "continent": "me",
    "coastal": false,
    "path": "M1000.8,442.2L1000.8,475.8L971.7,492.7L942.5,475.8L942.5,442.2L971.7,425.3Z",
    "labelX": 971.7,
    "labelY": 459.0
  },
  {
    "id": "chad",
    "name": "Inland Lake",
    "continent": "an",
    "coastal": false,
    "path": "M912.5,493.2L912.5,526.8L883.3,543.7L854.2,526.8L854.2,493.2L883.3,476.3Z",
    "labelX": 883.3,
    "labelY": 510.0
  },
  {
    "id": "nubia",
    "name": "Cataract",
    "continent": "an",
    "coastal": true,
    "path": "M824.2,544.2L824.2,577.8L795.0,594.7L765.9,577.8L765.9,544.2L795.0,527.3Z",
    "labelX": 795.0,
    "labelY": 561.0
  },
  {
    "id": "rift",
    "name": "Rift",
    "continent": "an",
    "coastal": true,
    "path": "M765.3,442.2L765.3,475.8L736.1,492.7L707.0,475.8L707.0,442.2L736.1,425.3Z",
    "labelX": 736.1,
    "labelY": 459.0
  },
  {
    "id": "greensahara",
    "name": "Green Erg",
    "continent": "an",
    "coastal": false,
    "path": "M883.1,442.2L883.1,475.8L853.9,492.7L824.8,475.8L824.8,442.2L853.9,425.3Z",
    "labelX": 853.9,
    "labelY": 459.0
  },
  {
    "id": "congo",
    "name": "Rain Basin",
    "continent": "an",
    "coastal": false,
    "path": "M883.1,544.2L883.1,577.8L853.9,594.7L824.8,577.8L824.8,544.2L853.9,527.3Z",
    "labelX": 853.9,
    "labelY": 561.0
  },
  {
    "id": "fezzan",
    "name": "Sand Sea",
    "continent": "an",
    "coastal": true,
    "path": "M765.3,544.2L765.3,577.8L736.1,594.7L707.0,577.8L707.0,544.2L736.1,527.3Z",
    "labelX": 736.1,
    "labelY": 561.0
  },
  {
    "id": "kanem",
    "name": "Thorn Jungle",
    "continent": "an",
    "coastal": false,
    "path": "M971.4,595.2L971.4,628.8L942.2,645.7L913.1,628.8L913.1,595.2L942.2,578.3Z",
    "labelX": 942.2,
    "labelY": 612.0
  },
  {
    "id": "axum",
    "name": "High Escarp",
    "continent": "an",
    "coastal": false,
    "path": "M1000.8,544.2L1000.8,577.8L971.7,594.7L942.5,577.8L942.5,544.2L971.7,527.3Z",
    "labelX": 971.7,
    "labelY": 561.0
  },
  {
    "id": "nyasa",
    "name": "Rift Lake",
    "continent": "af",
    "coastal": true,
    "path": "M941.9,850.2L941.9,883.8L912.8,900.7L883.6,883.8L883.6,850.2L912.8,833.3Z",
    "labelX": 912.8,
    "labelY": 867.0
  },
  {
    "id": "karoo",
    "name": "Karoo",
    "continent": "af",
    "coastal": true,
    "path": "M971.4,697.2L971.4,730.8L942.2,747.7L913.1,730.8L913.1,697.2L942.2,680.3Z",
    "labelX": 942.2,
    "labelY": 714.0
  },
  {
    "id": "okavango",
    "name": "Inland Delta",
    "continent": "af",
    "coastal": true,
    "path": "M853.6,595.2L853.6,628.8L824.5,645.7L795.3,628.8L795.3,595.2L824.5,578.3Z",
    "labelX": 824.5,
    "labelY": 612.0
  },
  {
    "id": "pondoland",
    "name": "Thorn Escarp",
    "continent": "af",
    "coastal": false,
    "path": "M941.9,748.2L941.9,781.8L912.8,798.7L883.6,781.8L883.6,748.2L912.8,731.3Z",
    "labelX": 912.8,
    "labelY": 765.0
  },
  {
    "id": "madagascar",
    "name": "Isle Savanna",
    "continent": "af",
    "coastal": true,
    "path": "M1089.2,697.2L1089.2,730.8L1060.0,747.7L1030.9,730.8L1030.9,697.2L1060.0,680.3Z",
    "labelX": 1060.0,
    "labelY": 714.0
  },
  {
    "id": "namaqua",
    "name": "Fog Veld",
    "continent": "af",
    "coastal": true,
    "path": "M1059.7,748.2L1059.7,781.8L1030.6,798.7L1001.4,781.8L1001.4,748.2L1030.6,731.3Z",
    "labelX": 1030.6,
    "labelY": 765.0
  },
  {
    "id": "bechuana",
    "name": "Salt Pan",
    "continent": "af",
    "coastal": true,
    "path": "M912.5,799.2L912.5,832.8L883.3,849.7L854.2,832.8L854.2,799.2L883.3,782.3Z",
    "labelX": 883.3,
    "labelY": 816.0
  },
  {
    "id": "transvaal",
    "name": "High Veld",
    "continent": "af",
    "coastal": true,
    "path": "M912.5,697.2L912.5,730.8L883.3,747.7L854.2,730.8L854.2,697.2L883.3,680.3Z",
    "labelX": 883.3,
    "labelY": 714.0
  },
  {
    "id": "swazi",
    "name": "High Kopje",
    "continent": "af",
    "coastal": false,
    "path": "M941.9,544.2L941.9,577.8L912.8,594.7L883.6,577.8L883.6,544.2L912.8,527.3Z",
    "labelX": 912.8,
    "labelY": 561.0
  },
  {
    "id": "kalahari",
    "name": "Sand Veld",
    "continent": "af",
    "coastal": false,
    "path": "M941.9,646.2L941.9,679.8L912.8,696.7L883.6,679.8L883.6,646.2L912.8,629.3Z",
    "labelX": 912.8,
    "labelY": 663.0
  },
  {
    "id": "drakensberg",
    "name": "Stone Escarp",
    "continent": "af",
    "coastal": true,
    "path": "M1030.3,697.2L1030.3,730.8L1001.1,747.7L972.0,730.8L972.0,697.2L1001.1,680.3Z",
    "labelX": 1001.1,
    "labelY": 714.0
  },
  {
    "id": "namib",
    "name": "Fog Shore",
    "continent": "af",
    "coastal": true,
    "path": "M794.7,595.2L794.7,628.8L765.6,645.7L736.4,628.8L736.4,595.2L765.6,578.3Z",
    "labelX": 765.6,
    "labelY": 612.0
  },
  {
    "id": "highveld",
    "name": "Grass Veld",
    "continent": "af",
    "coastal": true,
    "path": "M883.1,748.2L883.1,781.8L853.9,798.7L824.8,781.8L824.8,748.2L853.9,731.3Z",
    "labelX": 853.9,
    "labelY": 765.0
  },
  {
    "id": "caprivi",
    "name": "River Reach",
    "continent": "af",
    "coastal": false,
    "path": "M912.5,595.2L912.5,628.8L883.3,645.7L854.2,628.8L854.2,595.2L883.3,578.3Z",
    "labelX": 883.3,
    "labelY": 612.0
  },
  {
    "id": "natal",
    "name": "Warm Escarp",
    "continent": "af",
    "coastal": true,
    "path": "M971.4,799.2L971.4,832.8L942.2,849.7L913.1,832.8L913.1,799.2L942.2,782.3Z",
    "labelX": 942.2,
    "labelY": 816.0
  },
  {
    "id": "zambezi",
    "name": "Falls",
    "continent": "af",
    "coastal": true,
    "path": "M1000.8,646.2L1000.8,679.8L971.7,696.7L942.5,679.8L942.5,646.2L971.7,629.3Z",
    "labelX": 971.7,
    "labelY": 663.0
  },
  {
    "id": "limpopo",
    "name": "River Gorge",
    "continent": "af",
    "coastal": true,
    "path": "M1000.8,748.2L1000.8,781.8L971.7,798.7L942.5,781.8L942.5,748.2L971.7,731.3Z",
    "labelX": 971.7,
    "labelY": 765.0
  },
  {
    "id": "lesotho",
    "name": "Cloud Escarp",
    "continent": "af",
    "coastal": true,
    "path": "M1030.3,595.2L1030.3,628.8L1001.1,645.7L972.0,628.8L972.0,595.2L1001.1,578.3Z",
    "labelX": 1001.1,
    "labelY": 612.0
  },
  {
    "id": "mashona",
    "name": "Bushveld",
    "continent": "af",
    "coastal": true,
    "path": "M883.1,646.2L883.1,679.8L853.9,696.7L824.8,679.8L824.8,646.2L853.9,629.3Z",
    "labelX": 853.9,
    "labelY": 663.0
  },
  {
    "id": "dilmun",
    "name": "Palm Oasis",
    "continent": "me",
    "coastal": false,
    "path": "M1177.5,340.2L1177.5,373.8L1148.3,390.7L1119.2,373.8L1119.2,340.2L1148.3,323.3Z",
    "labelX": 1148.3,
    "labelY": 357.0
  },
  {
    "id": "levant",
    "name": "Coast Slope",
    "continent": "me",
    "coastal": false,
    "path": "M1089.2,391.2L1089.2,424.8L1060.0,441.7L1030.9,424.8L1030.9,391.2L1060.0,374.3Z",
    "labelX": 1060.0,
    "labelY": 408.0
  },
  {
    "id": "phoenicia",
    "name": "Cedar Slope",
    "continent": "me",
    "coastal": false,
    "path": "M1236.4,340.2L1236.4,373.8L1207.2,390.7L1178.1,373.8L1178.1,340.2L1207.2,323.3Z",
    "labelX": 1207.2,
    "labelY": 357.0
  },
  {
    "id": "persia",
    "name": "Warm Table",
    "continent": "me",
    "coastal": false,
    "path": "M1148.1,391.2L1148.1,424.8L1118.9,441.7L1089.8,424.8L1089.8,391.2L1118.9,374.3Z",
    "labelX": 1118.9,
    "labelY": 408.0
  },
  {
    "id": "urartu",
    "name": "Lake High",
    "continent": "me",
    "coastal": true,
    "path": "M1000.8,340.2L1000.8,373.8L971.7,390.7L942.5,373.8L942.5,340.2L971.7,323.3Z",
    "labelX": 971.7,
    "labelY": 357.0
  },
  {
    "id": "parthia",
    "name": "East Plateau",
    "continent": "me",
    "coastal": true,
    "path": "M1059.7,340.2L1059.7,373.8L1030.6,390.7L1001.4,373.8L1001.4,340.2L1030.6,323.3Z",
    "labelX": 1030.6,
    "labelY": 357.0
  },
  {
    "id": "hejaz",
    "name": "Red Dune",
    "continent": "me",
    "coastal": false,
    "path": "M971.4,493.2L971.4,526.8L942.2,543.7L913.1,526.8L913.1,493.2L942.2,476.3Z",
    "labelX": 942.2,
    "labelY": 510.0
  },
  {
    "id": "tigris",
    "name": "Sumer",
    "continent": "me",
    "coastal": false,
    "path": "M1118.6,340.2L1118.6,373.8L1089.5,390.7L1060.3,373.8L1060.3,340.2L1089.5,323.3Z",
    "labelX": 1089.5,
    "labelY": 357.0
  },
  {
    "id": "nabataea",
    "name": "Red Rock",
    "continent": "me",
    "coastal": false,
    "path": "M1148.1,289.2L1148.1,322.8L1118.9,339.7L1089.8,322.8L1089.8,289.2L1118.9,272.3Z",
    "labelX": 1118.9,
    "labelY": 306.0
  },
  {
    "id": "anatolia",
    "name": "High Plateau",
    "continent": "me",
    "coastal": false,
    "path": "M1030.3,289.2L1030.3,322.8L1001.1,339.7L972.0,322.8L972.0,289.2L1001.1,272.3Z",
    "labelX": 1001.1,
    "labelY": 306.0
  },
  {
    "id": "media",
    "name": "Dust Plain",
    "continent": "me",
    "coastal": false,
    "path": "M1059.7,442.2L1059.7,475.8L1030.6,492.7L1001.4,475.8L1001.4,442.2L1030.6,425.3Z",
    "labelX": 1030.6,
    "labelY": 459.0
  },
  {
    "id": "caucasus",
    "name": "Caucasus",
    "continent": "me",
    "coastal": false,
    "path": "M1089.2,289.2L1089.2,322.8L1060.0,339.7L1030.9,322.8L1030.9,289.2L1060.0,272.3Z",
    "labelX": 1060.0,
    "labelY": 306.0
  },
  {
    "id": "sumer",
    "name": "Flood Land",
    "continent": "me",
    "coastal": true,
    "path": "M1118.6,442.2L1118.6,475.8L1089.5,492.7L1060.3,475.8L1060.3,442.2L1089.5,425.3Z",
    "labelX": 1089.5,
    "labelY": 459.0
  },
  {
    "id": "elam",
    "name": "River Oasis",
    "continent": "me",
    "coastal": false,
    "path": "M1177.5,442.2L1177.5,475.8L1148.3,492.7L1119.2,475.8L1119.2,442.2L1148.3,425.3Z",
    "labelX": 1148.3,
    "labelY": 459.0
  },
  {
    "id": "cappadocia",
    "name": "East Savanna",
    "continent": "an",
    "coastal": true,
    "path": "M1059.7,544.2L1059.7,577.8L1030.6,594.7L1001.4,577.8L1001.4,544.2L1030.6,527.3Z",
    "labelX": 1030.6,
    "labelY": 561.0
  },
  {
    "id": "tuva",
    "name": "West Taiga",
    "continent": "aw",
    "coastal": true,
    "path": "M1118.6,136.2L1118.6,169.8L1089.5,186.7L1060.3,169.8L1060.3,136.2L1089.5,119.3Z",
    "labelX": 1089.5,
    "labelY": 153.0
  },
  {
    "id": "dzungaria",
    "name": "Salt Steppe",
    "continent": "aw",
    "coastal": false,
    "path": "M1324.7,289.2L1324.7,322.8L1295.6,339.7L1266.4,322.8L1266.4,289.2L1295.6,272.3Z",
    "labelX": 1295.6,
    "labelY": 306.0
  },
  {
    "id": "kolyma",
    "name": "Ice River",
    "continent": "aw",
    "coastal": false,
    "path": "M1206.9,289.2L1206.9,322.8L1177.8,339.7L1148.6,322.8L1148.6,289.2L1177.8,272.3Z",
    "labelX": 1177.8,
    "labelY": 306.0
  },
  {
    "id": "yakutia",
    "name": "Frost Steppe",
    "continent": "aw",
    "coastal": true,
    "path": "M1236.4,136.2L1236.4,169.8L1207.2,186.7L1178.1,169.8L1178.1,136.2L1207.2,119.3Z",
    "labelX": 1207.2,
    "labelY": 153.0
  },
  {
    "id": "fuji",
    "name": "Warm Taiga",
    "continent": "aw",
    "coastal": false,
    "path": "M1206.9,187.2L1206.9,220.8L1177.8,237.7L1148.6,220.8L1148.6,187.2L1177.8,170.3Z",
    "labelX": 1177.8,
    "labelY": 204.0
  },
  {
    "id": "korea",
    "name": "South Desert",
    "continent": "aw",
    "coastal": false,
    "path": "M1295.3,340.2L1295.3,373.8L1266.1,390.7L1237.0,373.8L1237.0,340.2L1266.1,323.3Z",
    "labelX": 1266.1,
    "labelY": 357.0
  },
  {
    "id": "baikal",
    "name": "Ice Lake",
    "continent": "aw",
    "coastal": false,
    "path": "M1324.7,187.2L1324.7,220.8L1295.6,237.7L1266.4,220.8L1266.4,187.2L1295.6,170.3Z",
    "labelX": 1295.6,
    "labelY": 204.0
  },
  {
    "id": "amur",
    "name": "River Taiga",
    "continent": "aw",
    "coastal": true,
    "path": "M1354.2,136.2L1354.2,169.8L1325.0,186.7L1295.9,169.8L1295.9,136.2L1325.0,119.3Z",
    "labelX": 1325.0,
    "labelY": 153.0
  },
  {
    "id": "sayan",
    "name": "High Taiga",
    "continent": "aw",
    "coastal": false,
    "path": "M1177.5,238.2L1177.5,271.8L1148.3,288.7L1119.2,271.8L1119.2,238.2L1148.3,221.3Z",
    "labelX": 1148.3,
    "labelY": 255.0
  },
  {
    "id": "tarim",
    "name": "Dry Basin",
    "continent": "aw",
    "coastal": false,
    "path": "M1295.3,238.2L1295.3,271.8L1266.1,288.7L1237.0,271.8L1237.0,238.2L1266.1,221.3Z",
    "labelX": 1266.1,
    "labelY": 255.0
  },
  {
    "id": "primorye",
    "name": "Rain Shadow",
    "continent": "ae",
    "coastal": false,
    "path": "M1383.6,391.2L1383.6,424.8L1354.5,441.7L1325.3,424.8L1325.3,391.2L1354.5,374.3Z",
    "labelX": 1354.5,
    "labelY": 408.0
  },
  {
    "id": "yenisei",
    "name": "Crag",
    "continent": "eu",
    "coastal": true,
    "path": "M1059.7,136.2L1059.7,169.8L1030.6,186.7L1001.4,169.8L1001.4,136.2L1030.6,119.3Z",
    "labelX": 1030.6,
    "labelY": 153.0
  },
  {
    "id": "kamchatka",
    "name": "Fire Steppe",
    "continent": "aw",
    "coastal": true,
    "path": "M1177.5,136.2L1177.5,169.8L1148.3,186.7L1119.2,169.8L1119.2,136.2L1148.3,119.3Z",
    "labelX": 1148.3,
    "labelY": 153.0
  },
  {
    "id": "altai",
    "name": "Altai",
    "continent": "aw",
    "coastal": false,
    "path": "M1265.8,289.2L1265.8,322.8L1236.7,339.7L1207.5,322.8L1207.5,289.2L1236.7,272.3Z",
    "labelX": 1236.7,
    "labelY": 306.0
  },
  {
    "id": "chukotka",
    "name": "Ice Steppe",
    "continent": "aw",
    "coastal": true,
    "path": "M1295.3,136.2L1295.3,169.8L1266.1,186.7L1237.0,169.8L1237.0,136.2L1266.1,119.3Z",
    "labelX": 1266.1,
    "labelY": 153.0
  },
  {
    "id": "buryatia",
    "name": "Lake Taiga",
    "continent": "aw",
    "coastal": false,
    "path": "M1148.1,187.2L1148.1,220.8L1118.9,237.7L1089.8,220.8L1089.8,187.2L1118.9,170.3Z",
    "labelX": 1118.9,
    "labelY": 204.0
  },
  {
    "id": "siberia",
    "name": "Siberia",
    "continent": "aw",
    "coastal": false,
    "path": "M1265.8,187.2L1265.8,220.8L1236.7,237.7L1207.5,220.8L1207.5,187.2L1236.7,170.3Z",
    "labelX": 1236.7,
    "labelY": 204.0
  },
  {
    "id": "kunlun",
    "name": "Salt Desert",
    "continent": "me",
    "coastal": false,
    "path": "M1206.9,391.2L1206.9,424.8L1177.8,441.7L1148.6,424.8L1148.6,391.2L1177.8,374.3Z",
    "labelX": 1177.8,
    "labelY": 408.0
  },
  {
    "id": "manchuria",
    "name": "Black Earth",
    "continent": "aw",
    "coastal": false,
    "path": "M1236.4,238.2L1236.4,271.8L1207.2,288.7L1178.1,271.8L1178.1,238.2L1207.2,221.3Z",
    "labelX": 1207.2,
    "labelY": 255.0
  },
  {
    "id": "jilin",
    "name": "Inner Steppe",
    "continent": "ae",
    "coastal": false,
    "path": "M1501.4,187.2L1501.4,220.8L1472.2,237.7L1443.1,220.8L1443.1,187.2L1472.2,170.3Z",
    "labelX": 1472.2,
    "labelY": 204.0
  },
  {
    "id": "chuvan",
    "name": "Stone Taiga",
    "continent": "aw",
    "coastal": false,
    "path": "M1354.2,238.2L1354.2,271.8L1325.0,288.7L1295.9,271.8L1295.9,238.2L1325.0,221.3Z",
    "labelX": 1325.0,
    "labelY": 255.0
  },
  {
    "id": "oroqen",
    "name": "Dry Coast",
    "continent": "ae",
    "coastal": true,
    "path": "M1442.5,391.2L1442.5,424.8L1413.4,441.7L1384.2,424.8L1384.2,391.2L1413.4,374.3Z",
    "labelX": 1413.4,
    "labelY": 408.0
  },
  {
    "id": "gobi",
    "name": "Kunlun",
    "continent": "ae",
    "coastal": false,
    "path": "M1413.1,340.2L1413.1,373.8L1383.9,390.7L1354.8,373.8L1354.8,340.2L1383.9,323.3Z",
    "labelX": 1383.9,
    "labelY": 357.0
  },
  {
    "id": "ryukyu",
    "name": "Coral Isle",
    "continent": "ae",
    "coastal": true,
    "path": "M1589.7,238.2L1589.7,271.8L1560.6,288.7L1531.4,271.8L1531.4,238.2L1560.6,221.3Z",
    "labelX": 1560.6,
    "labelY": 255.0
  },
  {
    "id": "jeju",
    "name": "Cinder Isle",
    "continent": "ae",
    "coastal": true,
    "path": "M1619.2,187.2L1619.2,220.8L1590.0,237.7L1560.9,220.8L1560.9,187.2L1590.0,170.3Z",
    "labelX": 1590.0,
    "labelY": 204.0
  },
  {
    "id": "anadyr",
    "name": "Cloud Slope",
    "continent": "ae",
    "coastal": false,
    "path": "M1442.5,289.2L1442.5,322.8L1413.4,339.7L1384.2,322.8L1384.2,289.2L1413.4,272.3Z",
    "labelX": 1413.4,
    "labelY": 306.0
  },
  {
    "id": "udege",
    "name": "Larch Shore",
    "continent": "ae",
    "coastal": true,
    "path": "M1442.5,187.2L1442.5,220.8L1413.4,237.7L1384.2,220.8L1384.2,187.2L1413.4,170.3Z",
    "labelX": 1413.4,
    "labelY": 204.0
  },
  {
    "id": "hokkaido",
    "name": "Mist Coast",
    "continent": "ae",
    "coastal": true,
    "path": "M1471.9,238.2L1471.9,271.8L1442.8,288.7L1413.6,271.8L1413.6,238.2L1442.8,221.3Z",
    "labelX": 1442.8,
    "labelY": 255.0
  },
  {
    "id": "kuril",
    "name": "Chain Isle",
    "continent": "ae",
    "coastal": true,
    "path": "M1471.9,136.2L1471.9,169.8L1442.8,186.7L1413.6,169.8L1413.6,136.2L1442.8,119.3Z",
    "labelX": 1442.8,
    "labelY": 153.0
  },
  {
    "id": "koryak",
    "name": "Fire Coast",
    "continent": "ae",
    "coastal": true,
    "path": "M1530.8,340.2L1530.8,373.8L1501.7,390.7L1472.5,373.8L1472.5,340.2L1501.7,323.3Z",
    "labelX": 1501.7,
    "labelY": 357.0
  },
  {
    "id": "tsushima",
    "name": "Tide Pass",
    "continent": "ae",
    "coastal": false,
    "path": "M1560.3,187.2L1560.3,220.8L1531.1,237.7L1502.0,220.8L1502.0,187.2L1531.1,170.3Z",
    "labelX": 1531.1,
    "labelY": 204.0
  },
  {
    "id": "sakhalin",
    "name": "Long Isle",
    "continent": "ae",
    "coastal": true,
    "path": "M1678.1,187.2L1678.1,220.8L1648.9,237.7L1619.8,220.8L1619.8,187.2L1648.9,170.3Z",
    "labelX": 1648.9,
    "labelY": 204.0
  },
  {
    "id": "liaodong",
    "name": "Wet Terrace",
    "continent": "ae",
    "coastal": false,
    "path": "M1383.6,289.2L1383.6,322.8L1354.5,339.7L1325.3,322.8L1325.3,289.2L1354.5,272.3Z",
    "labelX": 1354.5,
    "labelY": 306.0
  },
  {
    "id": "ezo",
    "name": "Pine Slope",
    "continent": "ae",
    "coastal": false,
    "path": "M1413.1,238.2L1413.1,271.8L1383.9,288.7L1354.8,271.8L1354.8,238.2L1383.9,221.3Z",
    "labelX": 1383.9,
    "labelY": 255.0
  },
  {
    "id": "magadan",
    "name": "Black Sand",
    "continent": "ae",
    "coastal": true,
    "path": "M1501.4,289.2L1501.4,322.8L1472.2,339.7L1443.1,322.8L1443.1,289.2L1472.2,272.3Z",
    "labelX": 1472.2,
    "labelY": 306.0
  },
  {
    "id": "nanai",
    "name": "Stone Coast",
    "continent": "ae",
    "coastal": true,
    "path": "M1530.8,238.2L1530.8,271.8L1501.7,288.7L1472.5,271.8L1472.5,238.2L1501.7,221.3Z",
    "labelX": 1501.7,
    "labelY": 255.0
  },
  {
    "id": "heilong",
    "name": "North Steppe",
    "continent": "ae",
    "coastal": true,
    "path": "M1413.1,136.2L1413.1,169.8L1383.9,186.7L1354.8,169.8L1354.8,136.2L1383.9,119.3Z",
    "labelX": 1383.9,
    "labelY": 153.0
  },
  {
    "id": "okhotsk",
    "name": "Cold Bay",
    "continent": "ae",
    "coastal": true,
    "path": "M1383.6,187.2L1383.6,220.8L1354.5,237.7L1325.3,220.8L1325.3,187.2L1354.5,170.3Z",
    "labelX": 1354.5,
    "labelY": 204.0
  },
  {
    "id": "ulaan",
    "name": "Red Desert",
    "continent": "ae",
    "coastal": true,
    "path": "M1471.9,340.2L1471.9,373.8L1442.8,390.7L1413.6,373.8L1413.6,340.2L1442.8,323.3Z",
    "labelX": 1442.8,
    "labelY": 357.0
  },
  {
    "id": "malaya",
    "name": "Palm Ghat",
    "continent": "ss",
    "coastal": true,
    "path": "M1236.4,544.2L1236.4,577.8L1207.2,594.7L1178.1,577.8L1178.1,544.2L1207.2,527.3Z",
    "labelX": 1207.2,
    "labelY": 561.0
  },
  {
    "id": "kashmir",
    "name": "Snow Ghat",
    "continent": "ss",
    "coastal": true,
    "path": "M1265.8,493.2L1265.8,526.8L1236.7,543.7L1207.5,526.8L1207.5,493.2L1236.7,476.3Z",
    "labelX": 1236.7,
    "labelY": 510.0
  },
  {
    "id": "irrawaddy",
    "name": "Shangri La",
    "continent": "ss",
    "coastal": true,
    "path": "M1324.7,493.2L1324.7,526.8L1295.6,543.7L1266.4,526.8L1266.4,493.2L1295.6,476.3Z",
    "labelX": 1295.6,
    "labelY": 510.0
  },
  {
    "id": "shangrila",
    "name": "Mist Hill",
    "continent": "ss",
    "coastal": false,
    "path": "M1354.2,340.2L1354.2,373.8L1325.0,390.7L1295.9,373.8L1295.9,340.2L1325.0,323.3Z",
    "labelX": 1325.0,
    "labelY": 357.0
  },
  {
    "id": "bengal",
    "name": "Wet Delta",
    "continent": "ss",
    "coastal": true,
    "path": "M1383.6,493.2L1383.6,526.8L1354.5,543.7L1325.3,526.8L1325.3,493.2L1354.5,476.3Z",
    "labelX": 1354.5,
    "labelY": 510.0
  },
  {
    "id": "ceylon",
    "name": "Isle Ghat",
    "continent": "ss",
    "coastal": false,
    "path": "M1236.4,442.2L1236.4,475.8L1207.2,492.7L1178.1,475.8L1178.1,442.2L1207.2,425.3Z",
    "labelX": 1207.2,
    "labelY": 459.0
  },
  {
    "id": "ghats",
    "name": "Ghat",
    "continent": "ss",
    "coastal": false,
    "path": "M1295.3,442.2L1295.3,475.8L1266.1,492.7L1237.0,475.8L1237.0,442.2L1266.1,425.3Z",
    "labelX": 1266.1,
    "labelY": 459.0
  },
  {
    "id": "deccan",
    "name": "High Ghat",
    "continent": "ss",
    "coastal": true,
    "path": "M1206.9,493.2L1206.9,526.8L1177.8,543.7L1148.6,526.8L1148.6,493.2L1177.8,476.3Z",
    "labelX": 1177.8,
    "labelY": 510.0
  },
  {
    "id": "mekong",
    "name": "River Grass",
    "continent": "ss",
    "coastal": false,
    "path": "M1354.2,442.2L1354.2,475.8L1325.0,492.7L1295.9,475.8L1295.9,442.2L1325.0,425.3Z",
    "labelX": 1325.0,
    "labelY": 459.0
  },
  {
    "id": "tamil",
    "name": "Stone Ghat",
    "continent": "ss",
    "coastal": false,
    "path": "M1383.6,595.2L1383.6,628.8L1354.5,645.7L1325.3,628.8L1325.3,595.2L1354.5,578.3Z",
    "labelX": 1354.5,
    "labelY": 612.0
  },
  {
    "id": "annam",
    "name": "Rain Gorge",
    "continent": "ss",
    "coastal": true,
    "path": "M1413.1,442.2L1413.1,475.8L1383.9,492.7L1354.8,475.8L1354.8,442.2L1383.9,425.3Z",
    "labelX": 1383.9,
    "labelY": 459.0
  },
  {
    "id": "sundaland",
    "name": "Shelf Isle",
    "continent": "ss",
    "coastal": true,
    "path": "M1354.2,544.2L1354.2,577.8L1325.0,594.7L1295.9,577.8L1295.9,544.2L1325.0,527.3Z",
    "labelX": 1325.0,
    "labelY": 561.0
  },
  {
    "id": "punjab",
    "name": "River Ghat",
    "continent": "ss",
    "coastal": true,
    "path": "M1413.1,544.2L1413.1,577.8L1383.9,594.7L1354.8,577.8L1354.8,544.2L1383.9,527.3Z",
    "labelX": 1383.9,
    "labelY": 561.0
  },
  {
    "id": "java",
    "name": "Cedar Woods",
    "continent": "me",
    "coastal": false,
    "path": "M1265.8,391.2L1265.8,424.8L1236.7,441.7L1207.5,424.8L1207.5,391.2L1236.7,374.3Z",
    "labelX": 1236.7,
    "labelY": 408.0
  },
  {
    "id": "borneo",
    "name": "Peak Jungle",
    "continent": "ss",
    "coastal": true,
    "path": "M1295.3,544.2L1295.3,577.8L1266.1,594.7L1237.0,577.8L1237.0,544.2L1266.1,527.3Z",
    "labelX": 1266.1,
    "labelY": 561.0
  },
  {
    "id": "tibet",
    "name": "Roof Grass",
    "continent": "ae",
    "coastal": false,
    "path": "M1324.7,391.2L1324.7,424.8L1295.6,441.7L1266.4,424.8L1266.4,391.2L1295.6,374.3Z",
    "labelX": 1295.6,
    "labelY": 408.0
  },
  {
    "id": "pilbara",
    "name": "Red Ice",
    "continent": "oc",
    "coastal": false,
    "path": "M1589.7,850.2L1589.7,883.8L1560.6,900.7L1531.4,883.8L1531.4,850.2L1560.6,833.3Z",
    "labelX": 1560.6,
    "labelY": 867.0
  },
  {
    "id": "vanuatu",
    "name": "Ash Peak",
    "continent": "oc",
    "coastal": false,
    "path": "M1471.9,748.2L1471.9,781.8L1442.8,798.7L1413.6,781.8L1413.6,748.2L1442.8,731.3Z",
    "labelX": 1442.8,
    "labelY": 765.0
  },
  {
    "id": "barrier",
    "name": "Reef Wall",
    "continent": "oc",
    "coastal": true,
    "path": "M1560.3,901.2L1560.3,934.8L1531.1,951.7L1502.0,934.8L1502.0,901.2L1531.1,884.3Z",
    "labelX": 1531.1,
    "labelY": 918.0
  },
  {
    "id": "arnhem",
    "name": "North Grass",
    "continent": "oc",
    "coastal": true,
    "path": "M1442.5,799.2L1442.5,832.8L1413.4,849.7L1384.2,832.8L1384.2,799.2L1413.4,782.3Z",
    "labelX": 1413.4,
    "labelY": 816.0
  },
  {
    "id": "tasmania",
    "name": "South Peak",
    "continent": "oc",
    "coastal": true,
    "path": "M1560.3,799.2L1560.3,832.8L1531.1,849.7L1502.0,832.8L1502.0,799.2L1531.1,782.3Z",
    "labelX": 1531.1,
    "labelY": 816.0
  },
  {
    "id": "kimberley",
    "name": "Stone Table",
    "continent": "oc",
    "coastal": true,
    "path": "M1413.1,850.2L1413.1,883.8L1383.9,900.7L1354.8,883.8L1354.8,850.2L1383.9,833.3Z",
    "labelX": 1383.9,
    "labelY": 867.0
  },
  {
    "id": "papua",
    "name": "Warm Jungle",
    "continent": "oc",
    "coastal": true,
    "path": "M1471.9,646.2L1471.9,679.8L1442.8,696.7L1413.6,679.8L1413.6,646.2L1442.8,629.3Z",
    "labelX": 1442.8,
    "labelY": 663.0
  },
  {
    "id": "chatham",
    "name": "Grass Isle",
    "continent": "oc",
    "coastal": true,
    "path": "M1442.5,697.2L1442.5,730.8L1413.4,747.7L1384.2,730.8L1384.2,697.2L1413.4,680.3Z",
    "labelX": 1413.4,
    "labelY": 714.0
  },
  {
    "id": "carpentaria",
    "name": "Ice Gulf",
    "continent": "oc",
    "coastal": true,
    "path": "M1530.8,850.2L1530.8,883.8L1501.7,900.7L1472.5,883.8L1472.5,850.2L1501.7,833.3Z",
    "labelX": 1501.7,
    "labelY": 867.0
  },
  {
    "id": "melanesia",
    "name": "Ice Isle",
    "continent": "oc",
    "coastal": true,
    "path": "M1560.3,697.2L1560.3,730.8L1531.1,747.7L1502.0,730.8L1502.0,697.2L1531.1,680.3Z",
    "labelX": 1531.1,
    "labelY": 714.0
  },
  {
    "id": "aotearoa",
    "name": "Cloud Isle",
    "continent": "oc",
    "coastal": true,
    "path": "M1648.6,850.2L1648.6,883.8L1619.5,900.7L1590.3,883.8L1590.3,850.2L1619.5,833.3Z",
    "labelX": 1619.5,
    "labelY": 867.0
  },
  {
    "id": "uluru",
    "name": "Red Heart",
    "continent": "oc",
    "coastal": true,
    "path": "M1383.6,799.2L1383.6,832.8L1354.5,849.7L1325.3,832.8L1325.3,799.2L1354.5,782.3Z",
    "labelX": 1354.5,
    "labelY": 816.0
  },
  {
    "id": "zealandia",
    "name": "Sunken Range",
    "continent": "oc",
    "coastal": true,
    "path": "M1413.1,748.2L1413.1,781.8L1383.9,798.7L1354.8,781.8L1354.8,748.2L1383.9,731.3Z",
    "labelX": 1383.9,
    "labelY": 765.0
  },
  {
    "id": "coral",
    "name": "Coral Rise",
    "continent": "oc",
    "coastal": true,
    "path": "M1501.4,901.2L1501.4,934.8L1472.2,951.7L1443.1,934.8L1443.1,901.2L1472.2,884.3Z",
    "labelX": 1472.2,
    "labelY": 918.0
  },
  {
    "id": "nullarbor",
    "name": "Treeless",
    "continent": "oc",
    "coastal": false,
    "path": "M1530.8,748.2L1530.8,781.8L1501.7,798.7L1472.5,781.8L1472.5,748.2L1501.7,731.3Z",
    "labelX": 1501.7,
    "labelY": 765.0
  },
  {
    "id": "sahul",
    "name": "Sahul",
    "continent": "oc",
    "coastal": true,
    "path": "M1501.4,799.2L1501.4,832.8L1472.2,849.7L1443.1,832.8L1443.1,799.2L1472.2,782.3Z",
    "labelX": 1472.2,
    "labelY": 816.0
  },
  {
    "id": "outback",
    "name": "Red Sand",
    "continent": "oc",
    "coastal": true,
    "path": "M1619.2,799.2L1619.2,832.8L1590.0,849.7L1560.9,832.8L1560.9,799.2L1590.0,782.3Z",
    "labelX": 1590.0,
    "labelY": 816.0
  },
  {
    "id": "macquarie",
    "name": "South Jungle",
    "continent": "oc",
    "coastal": true,
    "path": "M1530.8,646.2L1530.8,679.8L1501.7,696.7L1472.5,679.8L1472.5,646.2L1501.7,629.3Z",
    "labelX": 1501.7,
    "labelY": 663.0
  },
  {
    "id": "fiji",
    "name": "Peak Isle",
    "continent": "oc",
    "coastal": false,
    "path": "M1501.4,697.2L1501.4,730.8L1472.2,747.7L1443.1,730.8L1443.1,697.2L1472.2,680.3Z",
    "labelX": 1472.2,
    "labelY": 714.0
  },
  {
    "id": "calusa",
    "name": "Mangrove",
    "continent": "ca",
    "coastal": true,
    "path": "M529.7,340.2L529.7,373.8L500.6,390.7L471.4,373.8L471.4,340.2L500.6,323.3Z",
    "labelX": 500.6,
    "labelY": 357.0
  },
  {
    "id": "lucayan",
    "name": "Sand Key",
    "continent": "ca",
    "coastal": true,
    "path": "M500.3,391.2L500.3,424.8L471.1,441.7L442.0,424.8L442.0,391.2L471.1,374.3Z",
    "labelX": 471.1,
    "labelY": 408.0
  },
  {
    "id": "ciboney",
    "name": "Coral Key",
    "continent": "ca",
    "coastal": true,
    "path": "M470.8,340.2L470.8,373.8L441.7,390.7L412.5,373.8L412.5,340.2L441.7,323.3Z",
    "labelX": 441.7,
    "labelY": 357.0
  },
  {
    "id": "bimini",
    "name": "Reef Key",
    "continent": "ca",
    "coastal": true,
    "path": "M411.9,340.2L411.9,373.8L382.8,390.7L353.6,373.8L353.6,340.2L382.8,323.3Z",
    "labelX": 382.8,
    "labelY": 357.0
  },
  {
    "id": "doggerland",
    "name": "Shallow",
    "continent": "eu",
    "coastal": true,
    "path": "M794.7,187.2L794.7,220.8L765.6,237.7L736.4,220.8L736.4,187.2L765.6,170.3Z",
    "labelX": 765.6,
    "labelY": 204.0
  },
  {
    "id": "jutland",
    "name": "Ness",
    "continent": "eu",
    "coastal": true,
    "path": "M941.9,136.2L941.9,169.8L912.8,186.7L883.6,169.8L883.6,136.2L912.8,119.3Z",
    "labelX": 912.8,
    "labelY": 153.0
  },
  {
    "id": "sarmatia",
    "name": "Open Steppe",
    "continent": "eu",
    "coastal": true,
    "path": "M1000.8,238.2L1000.8,271.8L971.7,288.7L942.5,271.8L942.5,238.2L971.7,221.3Z",
    "labelX": 971.7,
    "labelY": 255.0
  },
  {
    "id": "mentawai",
    "name": "Tide Forest",
    "continent": "ss",
    "coastal": true,
    "path": "M1324.7,595.2L1324.7,628.8L1295.6,645.7L1266.4,628.8L1266.4,595.2L1295.6,578.3Z",
    "labelX": 1295.6,
    "labelY": 612.0
  },
  {
    "id": "flores",
    "name": "Wet Isle",
    "continent": "ss",
    "coastal": true,
    "path": "M1354.2,646.2L1354.2,679.8L1325.0,696.7L1295.9,679.8L1295.9,646.2L1325.0,629.3Z",
    "labelX": 1325.0,
    "labelY": 663.0
  },
  {
    "id": "timor",
    "name": "East Jungle",
    "continent": "ss",
    "coastal": true,
    "path": "M1442.5,595.2L1442.5,628.8L1413.4,645.7L1384.2,628.8L1384.2,595.2L1413.4,578.3Z",
    "labelX": 1413.4,
    "labelY": 612.0
  },
  {
    "id": "loyalty",
    "name": "Lagoon",
    "continent": "oc",
    "coastal": true,
    "path": "M1619.2,901.2L1619.2,934.8L1590.0,951.7L1560.9,934.8L1560.9,901.2L1590.0,884.3Z",
    "labelX": 1590.0,
    "labelY": 918.0
  },
  {
    "id": "tasman",
    "name": "South Woods",
    "continent": "oc",
    "coastal": true,
    "path": "M1589.7,748.2L1589.7,781.8L1560.6,798.7L1531.4,781.8L1531.4,748.2L1560.6,731.3Z",
    "labelX": 1560.6,
    "labelY": 765.0
  },
  {
    "id": "tibesti",
    "name": "Stone Erg",
    "continent": "an",
    "coastal": true,
    "path": "M853.6,391.2L853.6,424.8L824.5,441.7L795.3,424.8L795.3,391.2L824.5,374.3Z",
    "labelX": 824.5,
    "labelY": 408.0
  },
  {
    "id": "hoggar",
    "name": "Red Hamada",
    "continent": "an",
    "coastal": true,
    "path": "M912.5,391.2L912.5,424.8L883.3,441.7L854.2,424.8L854.2,391.2L883.3,374.3Z",
    "labelX": 883.3,
    "labelY": 408.0
  },
  {
    "id": "scoresby",
    "name": "Cape Ice",
    "continent": "ne",
    "coastal": true,
    "path": "M500.3,289.2L500.3,322.8L471.1,339.7L442.0,322.8L442.0,289.2L471.1,272.3Z",
    "labelX": 471.1,
    "labelY": 306.0
  },
  {
    "id": "fram",
    "name": "Pack Shore",
    "continent": "ne",
    "coastal": true,
    "path": "M559.2,289.2L559.2,322.8L530.0,339.7L500.9,322.8L500.9,289.2L530.0,272.3Z",
    "labelX": 530.0,
    "labelY": 306.0
  },
  {
    "id": "tunu",
    "name": "Ice Margin",
    "continent": "ne",
    "coastal": true,
    "path": "M618.0,289.2L618.0,322.8L588.9,339.7L559.7,322.8L559.7,289.2L588.9,272.3Z",
    "labelX": 588.9,
    "labelY": 306.0
  },
  {
    "id": "tequesta",
    "name": "Warm Marsh",
    "continent": "ne",
    "coastal": true,
    "path": "M588.6,340.2L588.6,373.8L559.5,390.7L530.3,373.8L530.3,340.2L559.5,323.3Z",
    "labelX": 559.5,
    "labelY": 357.0
  },
  {
    "id": "timucua",
    "name": "Tide Jungle",
    "continent": "ne",
    "coastal": true,
    "path": "M647.5,340.2L647.5,373.8L618.3,390.7L589.2,373.8L589.2,340.2L618.3,323.3Z",
    "labelX": 618.3,
    "labelY": 357.0
  },
  {
    "id": "cuba",
    "name": "Warm Key",
    "continent": "ca",
    "coastal": true,
    "path": "M353.0,340.2L353.0,373.8L323.9,390.7L294.7,373.8L294.7,340.2L323.9,323.3Z",
    "labelX": 323.9,
    "labelY": 357.0
  },
  {
    "id": "alor",
    "name": "Reef Jungle",
    "continent": "ss",
    "coastal": true,
    "path": "M1413.1,646.2L1413.1,679.8L1383.9,696.7L1354.8,679.8L1354.8,646.2L1383.9,629.3Z",
    "labelX": 1383.9,
    "labelY": 663.0
  },
  {
    "id": "coats",
    "name": "Fast Ice",
    "continent": "at",
    "coastal": true,
    "path": "M647.5,1054.2L647.5,1087.8L618.3,1104.7L589.2,1087.8L589.2,1054.2L618.3,1037.3Z",
    "labelX": 618.3,
    "labelY": 1071.0
  },
  {
    "id": "larsen",
    "name": "Calve",
    "continent": "at",
    "coastal": true,
    "path": "M706.4,1054.2L706.4,1087.8L677.2,1104.7L648.1,1087.8L648.1,1054.2L677.2,1037.3Z",
    "labelX": 677.2,
    "labelY": 1071.0
  },
  {
    "id": "drake",
    "name": "Cold Reach",
    "continent": "sa",
    "coastal": true,
    "path": "M559.2,1003.2L559.2,1036.8L530.0,1053.7L500.9,1036.8L500.9,1003.2L530.0,986.3Z",
    "labelX": 530.0,
    "labelY": 1020.0
  },
  {
    "id": "fuegia",
    "name": "Ice Channel",
    "continent": "sa",
    "coastal": true,
    "path": "M500.3,1003.2L500.3,1036.8L471.1,1053.7L442.0,1036.8L442.0,1003.2L471.1,986.3Z",
    "labelX": 471.1,
    "labelY": 1020.0
  },
  {
    "id": "paria",
    "name": "River Mouth",
    "continent": "ca",
    "coastal": true,
    "path": "M441.4,493.2L441.4,526.8L412.2,543.7L383.1,526.8L383.1,493.2L412.2,476.3Z",
    "labelX": 412.2,
    "labelY": 510.0
  },
  {
    "id": "najd",
    "name": "High Dune",
    "continent": "me",
    "coastal": true,
    "path": "M1148.1,493.2L1148.1,526.8L1118.9,543.7L1089.8,526.8L1089.8,493.2L1118.9,476.3Z",
    "labelX": 1118.9,
    "labelY": 510.0
  },
  {
    "id": "gotland",
    "name": "Holm",
    "continent": "eu",
    "coastal": false,
    "path": "M971.4,187.2L971.4,220.8L942.2,237.7L913.1,220.8L913.1,187.2L942.2,170.3Z",
    "labelX": 942.2,
    "labelY": 204.0
  },
  {
    "id": "iturup",
    "name": "Fog Isle",
    "continent": "ae",
    "coastal": true,
    "path": "M1530.8,136.2L1530.8,169.8L1501.7,186.7L1472.5,169.8L1472.5,136.2L1501.7,119.3Z",
    "labelX": 1501.7,
    "labelY": 153.0
  },
  {
    "id": "kunashir",
    "name": "Green Isle",
    "continent": "ae",
    "coastal": true,
    "path": "M1589.7,136.2L1589.7,169.8L1560.6,186.7L1531.4,169.8L1531.4,136.2L1560.6,119.3Z",
    "labelX": 1560.6,
    "labelY": 153.0
  },
  {
    "id": "miskito",
    "name": "Wet Pass",
    "continent": "ca",
    "coastal": true,
    "path": "M382.5,493.2L382.5,526.8L353.3,543.7L324.2,526.8L324.2,493.2L353.3,476.3Z",
    "labelX": 353.3,
    "labelY": 510.0
  }
];

export const TERRITORY_BY_ID: Record<string, TerritoryDef> = Object.fromEntries(
  TERRITORIES.map((t) => [t.id, t]),
);

/** Independent tribes. Every land that is not a capital starts tribal. */
export const BARBARIAN_IDS: readonly string[] = TERRITORIES.map((t) => t.id).filter(
  (id) => !Object.values(CAPITOL).includes(id),
);

export const BARBARIAN_SET = new Set<string>(BARBARIAN_IDS);

const LAND_EDGES: [string, string][] = [["acadia", "algonquin"], ["acadia", "erie"], ["acadia", "hudson"], ["acadia", "iroquois"], ["acadia", "markland"], ["acadia", "ontario"], ["adelie", "byrd"], ["adelie", "dufek"], ["adelie", "ellsworth"], ["adelie", "ross"], ["adirondack", "carolina"], ["adirondack", "newfoundland"], ["adirondack", "nunavut"], ["aleut", "columbia"], ["aleut", "cordillera"], ["aleut", "laurentide"], ["aleut", "ohio"], ["aleut", "prairie"], ["algonquin", "cordillera"], ["algonquin", "illinois"], ["algonquin", "iroquois"], ["algonquin", "labrador"], ["algonquin", "markland"], ["alor", "chatham"], ["alor", "flores"], ["alor", "papua"], ["alor", "tamil"], ["alor", "timor"], ["alps", "anatolia"], ["alps", "atlas"], ["alps", "bohemia"], ["alps", "caledonia"], ["alps", "caucasus"], ["alps", "fjords"], ["alps", "sarmatia"], ["altai", "dzungaria"], ["altai", "kolyma"], ["altai", "korea"], ["altai", "manchuria"], ["altai", "phoenicia"], ["altai", "tarim"], ["altiplano", "atacama"], ["altiplano", "pampas"], ["altiplano", "pantanal"], ["altiplano", "patagonia"], ["altiplano", "plata"], ["amazon", "andes"], ["amazon", "araguaia"], ["amazon", "cerrado"], ["amazon", "chubut"], ["amazon", "guiana"], ["amazon", "marajo"], ["amundsen", "berkner"], ["amundsen", "byrd"], ["amundsen", "dufek"], ["amundsen", "enderby"], ["amundsen", "pennell"], ["amundsen", "siple"], ["amur", "baikal"], ["amur", "chukotka"], ["amur", "heilong"], ["amur", "okhotsk"], ["anadyr", "ezo"], ["anadyr", "gobi"], ["anadyr", "hokkaido"], ["anadyr", "liaodong"], ["anadyr", "magadan"], ["anadyr", "ulaan"], ["anatolia", "caucasus"], ["anatolia", "parthia"], ["anatolia", "sarmatia"], ["anatolia", "thrace"], ["anatolia", "urartu"], ["andes", "atacama"], ["andes", "chaco"], ["andes", "chubut"], ["andes", "marajo"], ["andes", "pantanal"], ["annam", "bengal"], ["annam", "mekong"], ["annam", "oroqen"], ["annam", "primorye"], ["aotearoa", "loyalty"], ["aotearoa", "outback"], ["aotearoa", "pilbara"], ["appalachia", "beringia"], ["appalachia", "dakota"], ["appalachia", "yukon"], ["aquitaine", "armorica"], ["aquitaine", "atlas"], ["aquitaine", "scythia"], ["aquitaine", "sirte"], ["aquitaine", "tibesti"], ["araguaia", "cerrado"], ["araguaia", "guiana"], ["araucania", "cerrado"], ["araucania", "chubut"], ["araucania", "orinoco"], ["arawak", "caribbean"], ["arawak", "lucayan"], ["arawak", "paria"], ["arawak", "yucatan"], ["armorica", "carpathian"], ["armorica", "scythia"], ["arnhem", "kimberley"], ["arnhem", "sahul"], ["arnhem", "uluru"], ["arnhem", "vanuatu"], ["arnhem", "zealandia"], ["asgard", "byrd"], ["asgard", "ellsworth"], ["asgard", "enderby"], ["asgard", "getz"], ["atacama", "chaco"], ["atacama", "pantanal"], ["atlantis", "caledonia"], ["atlantis", "gotland"], ["atlantis", "jutland"], ["atlantis", "yenisei"], ["atlas", "awdaghost"], ["atlas", "rift"], ["atlas", "tibesti"], ["awdaghost", "cyrenaica"], ["awdaghost", "darfur"], ["awdaghost", "greensahara"], ["awdaghost", "rift"], ["awdaghost", "tibesti"], ["axum", "cappadocia"], ["axum", "hejaz"], ["axum", "kanem"], ["axum", "kilimanjaro"], ["axum", "lesotho"], ["axum", "swazi"], ["baffin", "erie"], ["baffin", "fram"], ["baffin", "ontario"], ["baffin", "tunu"], ["baikal", "chukotka"], ["baikal", "chuvan"], ["baikal", "okhotsk"], ["baikal", "siberia"], ["baikal", "tarim"], ["baja", "hawaii"], ["baja", "maui"], ["baja", "nicoya"], ["baja", "sierra"], ["baja", "tarascan"], ["baja", "toltec"], ["barrier", "carpentaria"], ["barrier", "coral"], ["barrier", "loyalty"], ["barrier", "pilbara"], ["bechuana", "highveld"], ["bechuana", "natal"], ["bechuana", "nyasa"], ["bechuana", "pondoland"], ["bengal", "irrawaddy"], ["bengal", "mekong"], ["bengal", "punjab"], ["bengal", "sundaland"], ["beringia", "dakota"], ["beringia", "kamchatka"], ["beringia", "yukon"], ["berkner", "enderby"], ["berkner", "maud"], ["berkner", "siple"], ["bimini", "ciboney"], ["bimini", "cuba"], ["bimini", "greenland"], ["bimini", "helluland"], ["bimini", "yucatan"], ["bohemia", "buryatia"], ["bohemia", "caucasus"], ["bohemia", "fjords"], ["bohemia", "nabataea"], ["bohemia", "sayan"], ["borneo", "irrawaddy"], ["borneo", "kashmir"], ["borneo", "malaya"], ["borneo", "mentawai"], ["borneo", "sundaland"], ["buryatia", "fjords"], ["buryatia", "fuji"], ["buryatia", "kamchatka"], ["buryatia", "sayan"], ["buryatia", "tuva"], ["byrd", "dufek"], ["byrd", "ellsworth"], ["byrd", "enderby"], ["caledonia", "fjords"], ["caledonia", "gotland"], ["caledonia", "rhine"], ["caledonia", "sarmatia"], ["caledonia", "yenisei"], ["calusa", "ciboney"], ["calusa", "fram"], ["calusa", "lucayan"], ["calusa", "scoresby"], ["calusa", "tequesta"], ["cappadocia", "kilimanjaro"], ["cappadocia", "lesotho"], ["cappadocia", "sahel"], ["caprivi", "congo"], ["caprivi", "kalahari"], ["caprivi", "kanem"], ["caprivi", "mashona"], ["caprivi", "okavango"], ["caprivi", "swazi"], ["caribbean", "miskito"], ["caribbean", "paria"], ["caribbean", "volcan"], ["caribbean", "yucatan"], ["carolina", "fundy"], ["carolina", "huron"], ["carolina", "newfoundland"], ["carolina", "nunavut"], ["carolina", "winnipeg"], ["carpathian", "doggerland"], ["carpathian", "noricum"], ["carpathian", "scythia"], ["carpentaria", "coral"], ["carpentaria", "pilbara"], ["carpentaria", "sahul"], ["carpentaria", "tasmania"], ["carthage", "egypt"], ["carthage", "hejaz"], ["carthage", "kilimanjaro"], ["carthage", "liguria"], ["carthage", "media"], ["carthage", "nile"], ["cascades", "rockies"], ["cascades", "sierra"], ["cascades", "yukon"], ["cascades", "zapotec"], ["caucasus", "nabataea"], ["caucasus", "parthia"], ["caucasus", "tigris"], ["cerrado", "chubut"], ["ceylon", "deccan"], ["ceylon", "elam"], ["ceylon", "ghats"], ["ceylon", "java"], ["ceylon", "kashmir"], ["ceylon", "kunlun"], ["chaco", "chubut"], ["chad", "congo"], ["chad", "darfur"], ["chad", "egypt"], ["chad", "greensahara"], ["chad", "hejaz"], ["chad", "swazi"], ["chatham", "fiji"], ["chatham", "papua"], ["chatham", "vanuatu"], ["chatham", "zealandia"], ["chesapeake", "micmac"], ["chesapeake", "newfoundland"], ["chesapeake", "winnipeg"], ["chukotka", "siberia"], ["chukotka", "yakutia"], ["chuvan", "dzungaria"], ["chuvan", "ezo"], ["chuvan", "liaodong"], ["chuvan", "okhotsk"], ["chuvan", "tarim"], ["ciboney", "greenland"], ["ciboney", "lucayan"], ["ciboney", "scoresby"], ["ciboney", "yucatan"], ["coats", "larsen"], ["coats", "weddell"], ["columbia", "prairie"], ["congo", "darfur"], ["congo", "nubia"], ["congo", "okavango"], ["congo", "swazi"], ["cordillera", "labrador"], ["cordillera", "laurentide"], ["cordillera", "markland"], ["cordillera", "ohio"], ["cuba", "helluland"], ["cuba", "mackenzie"], ["cuba", "nicoya"], ["cuba", "toltec"], ["cyrenaica", "darfur"], ["cyrenaica", "fezzan"], ["cyrenaica", "gaetulia"], ["cyrenaica", "nubia"], ["cyrenaica", "rift"], ["dacia", "hoggar"], ["dacia", "nile"], ["dacia", "rhine"], ["dacia", "sirte"], ["dacia", "thrace"], ["dacia", "urartu"], ["darfur", "greensahara"], ["darfur", "nubia"], ["deccan", "elam"], ["deccan", "kashmir"], ["deccan", "malaya"], ["deccan", "najd"], ["dilmun", "kolyma"], ["dilmun", "kunlun"], ["dilmun", "nabataea"], ["dilmun", "persia"], ["dilmun", "phoenicia"], ["dilmun", "tigris"], ["doggerland", "fundy"], ["doggerland", "nunavut"], ["drake", "fuegia"], ["drake", "weddell"], ["drakensberg", "karoo"], ["drakensberg", "limpopo"], ["drakensberg", "madagascar"], ["drakensberg", "namaqua"], ["drakensberg", "zambezi"], ["dufek", "oates"], ["dufek", "pennell"], ["dufek", "ross"], ["dzungaria", "korea"], ["dzungaria", "liaodong"], ["dzungaria", "shangrila"], ["dzungaria", "tarim"], ["egypt", "greensahara"], ["egypt", "hejaz"], ["egypt", "hoggar"], ["egypt", "nile"], ["elam", "kunlun"], ["elam", "najd"], ["elam", "persia"], ["elam", "sumer"], ["enderby", "getz"], ["enderby", "maud"], ["erie", "fram"], ["erie", "hudson"], ["erie", "ontario"], ["erie", "scoresby"], ["ezo", "hokkaido"], ["ezo", "liaodong"], ["ezo", "okhotsk"], ["ezo", "udege"], ["fezzan", "gaetulia"], ["fezzan", "namib"], ["fezzan", "nubia"], ["fiji", "macquarie"], ["fiji", "melanesia"], ["fiji", "nullarbor"], ["fiji", "papua"], ["fiji", "vanuatu"], ["filchner", "getz"], ["filchner", "maud"], ["filchner", "vinson"], ["fjords", "tuva"], ["fjords", "yenisei"], ["flores", "mentawai"], ["flores", "tamil"], ["fram", "scoresby"], ["fram", "tequesta"], ["fram", "tunu"], ["fuegia", "tocantins"], ["fuji", "kamchatka"], ["fuji", "manchuria"], ["fuji", "sayan"], ["fuji", "siberia"], ["fuji", "yakutia"], ["fundy", "huron"], ["fundy", "muskeg"], ["fundy", "nunavut"], ["gaetulia", "rift"], ["getz", "maud"], ["getz", "vinson"], ["ghats", "irrawaddy"], ["ghats", "java"], ["ghats", "kashmir"], ["ghats", "mekong"], ["ghats", "tibet"], ["gobi", "liaodong"], ["gobi", "oroqen"], ["gobi", "primorye"], ["gobi", "shangrila"], ["gobi", "ulaan"], ["gotland", "helvetia"], ["gotland", "jutland"], ["gotland", "lusitania"], ["gotland", "sarmatia"], ["greenland", "helluland"], ["greenland", "hudson"], ["greenland", "scoresby"], ["greenland", "vinland"], ["greensahara", "hoggar"], ["greensahara", "tibesti"], ["guapore", "guiana"], ["guapore", "marajo"], ["guapore", "parana"], ["guiana", "marajo"], ["hawaii", "maui"], ["hawaii", "sierra"], ["heilong", "kuril"], ["heilong", "okhotsk"], ["heilong", "udege"], ["hejaz", "kilimanjaro"], ["hejaz", "swazi"], ["helluland", "mackenzie"], ["helluland", "nord"], ["helluland", "vinland"], ["helvetia", "lusitania"], ["helvetia", "noricum"], ["helvetia", "rhine"], ["helvetia", "sarmatia"], ["helvetia", "thrace"], ["highveld", "pondoland"], ["highveld", "transvaal"], ["hoggar", "nile"], ["hoggar", "sirte"], ["hoggar", "tibesti"], ["hokkaido", "jilin"], ["hokkaido", "magadan"], ["hokkaido", "nanai"], ["hokkaido", "udege"], ["hudson", "markland"], ["hudson", "scoresby"], ["hudson", "vinland"], ["huron", "muskeg"], ["huron", "winnipeg"], ["illinois", "iroquois"], ["illinois", "labrador"], ["illinois", "micmac"], ["iroquois", "micmac"], ["iroquois", "ontario"], ["irrawaddy", "kashmir"], ["irrawaddy", "mekong"], ["irrawaddy", "sundaland"], ["iturup", "jilin"], ["iturup", "kunashir"], ["iturup", "kuril"], ["iturup", "tsushima"], ["java", "korea"], ["java", "kunlun"], ["java", "phoenicia"], ["java", "tibet"], ["jeju", "kunashir"], ["jeju", "ryukyu"], ["jeju", "sakhalin"], ["jeju", "tsushima"], ["jilin", "kuril"], ["jilin", "nanai"], ["jilin", "tsushima"], ["jilin", "udege"], ["jutland", "lusitania"], ["kalahari", "kanem"], ["kalahari", "karoo"], ["kalahari", "mashona"], ["kalahari", "transvaal"], ["kalahari", "zambezi"], ["kamchatka", "tuva"], ["kamchatka", "yakutia"], ["kanem", "lesotho"], ["kanem", "swazi"], ["kanem", "zambezi"], ["karoo", "limpopo"], ["karoo", "pondoland"], ["karoo", "transvaal"], ["karoo", "zambezi"], ["kashmir", "malaya"], ["keewatin", "mackenzie"], ["keewatin", "nord"], ["keewatin", "prairie"], ["keewatin", "rockies"], ["keewatin", "zapotec"], ["kilimanjaro", "media"], ["kilimanjaro", "sahel"], ["kimberley", "uluru"], ["kolyma", "manchuria"], ["kolyma", "nabataea"], ["kolyma", "phoenicia"], ["kolyma", "sayan"], ["korea", "phoenicia"], ["korea", "shangrila"], ["korea", "tibet"], ["koryak", "magadan"], ["koryak", "ulaan"], ["kunashir", "tsushima"], ["kunlun", "persia"], ["kunlun", "phoenicia"], ["kuril", "udege"], ["labrador", "laurentide"], ["larsen", "ronne"], ["lesotho", "zambezi"], ["levant", "liguria"], ["levant", "media"], ["levant", "parthia"], ["levant", "persia"], ["levant", "sumer"], ["levant", "tigris"], ["liaodong", "shangrila"], ["liguria", "media"], ["liguria", "nile"], ["liguria", "parthia"], ["liguria", "urartu"], ["limpopo", "namaqua"], ["limpopo", "natal"], ["limpopo", "pondoland"], ["loyalty", "pilbara"], ["lucayan", "yucatan"], ["lusitania", "noricum"], ["mackenzie", "nicoya"], ["mackenzie", "nord"], ["mackenzie", "zapotec"], ["macquarie", "melanesia"], ["macquarie", "papua"], ["madagascar", "namaqua"], ["magadan", "nanai"], ["magadan", "ulaan"], ["magellan", "patagonia"], ["magellan", "peninsula"], ["magellan", "tocantins"], ["manchuria", "sayan"], ["manchuria", "siberia"], ["manchuria", "tarim"], ["marajo", "pantanal"], ["marajo", "parana"], ["markland", "ohio"], ["markland", "vinland"], ["mashona", "okavango"], ["mashona", "transvaal"], ["maui", "tarascan"], ["maui", "tehuantepec"], ["mayan", "olmec"], ["mayan", "panama"], ["mayan", "tehuantepec"], ["media", "sahel"], ["media", "sumer"], ["mekong", "primorye"], ["mekong", "tibet"], ["melanesia", "nullarbor"], ["melanesia", "tasman"], ["mentawai", "sundaland"], ["mentawai", "tamil"], ["miskito", "olmec"], ["miskito", "orinoco"], ["miskito", "panama"], ["miskito", "paria"], ["miskito", "volcan"], ["nabataea", "sayan"], ["nabataea", "tigris"], ["najd", "sahel"], ["najd", "sumer"], ["namib", "nubia"], ["namib", "okavango"], ["nanai", "ryukyu"], ["nanai", "tsushima"], ["natal", "nyasa"], ["natal", "pondoland"], ["newfoundland", "winnipeg"], ["nicoya", "sierra"], ["nicoya", "toltec"], ["nicoya", "zapotec"], ["nile", "urartu"], ["nord", "ohio"], ["nord", "prairie"], ["nord", "vinland"], ["noricum", "rhine"], ["noricum", "scythia"], ["nubia", "okavango"], ["nullarbor", "sahul"], ["nullarbor", "tasman"], ["nullarbor", "tasmania"], ["nullarbor", "vanuatu"], ["oates", "pennell"], ["oates", "ross"], ["oates", "shirase"], ["ohio", "prairie"], ["ohio", "vinland"], ["okhotsk", "udege"], ["olmec", "panama"], ["olmec", "tarascan"], ["olmec", "tehuantepec"], ["olmec", "volcan"], ["orinoco", "panama"], ["orinoco", "paria"], ["oroqen", "primorye"], ["oroqen", "ulaan"], ["outback", "pilbara"], ["outback", "tasman"], ["outback", "tasmania"], ["pampas", "pantanal"], ["pampas", "parana"], ["pampas", "plata"], ["pantanal", "parana"], ["papua", "timor"], ["parthia", "tigris"], ["parthia", "urartu"], ["patagonia", "peninsula"], ["patagonia", "plata"], ["peninsula", "plata"], ["peninsula", "tocantins"], ["peninsula", "weddell"], ["pennell", "siple"], ["persia", "sumer"], ["persia", "tigris"], ["pilbara", "tasmania"], ["pondoland", "transvaal"], ["primorye", "shangrila"], ["primorye", "tibet"], ["punjab", "sundaland"], ["punjab", "tamil"], ["punjab", "timor"], ["rhine", "scythia"], ["rhine", "sirte"], ["rhine", "thrace"], ["rockies", "yukon"], ["rockies", "zapotec"], ["ronne", "thurston"], ["ryukyu", "tsushima"], ["sahel", "sumer"], ["sahul", "tasmania"], ["sahul", "vanuatu"], ["sarmatia", "thrace"], ["scythia", "sirte"], ["shangrila", "tibet"], ["siberia", "tarim"], ["siberia", "yakutia"], ["sierra", "zapotec"], ["sirte", "tibesti"], ["sundaland", "tamil"], ["tamil", "timor"], ["tarascan", "tehuantepec"], ["tarascan", "toltec"], ["tarascan", "volcan"], ["tasman", "tasmania"], ["tequesta", "timucua"], ["tequesta", "tunu"], ["thrace", "urartu"], ["thurston", "vinson"], ["timucua", "tunu"], ["toltec", "volcan"], ["tuva", "yenisei"], ["uluru", "zealandia"], ["vanuatu", "zealandia"]] as [string, string][];
const SEA_EDGES: [string, string][] = [["adelie", "asgard"], ["adelie", "maud"], ["adelie", "oates"], ["adelie", "pennell"], ["adelie", "shirase"], ["adelie", "thurston"], ["adirondack", "arawak"], ["adirondack", "baffin"], ["adirondack", "chesapeake"], ["adirondack", "doggerland"], ["adirondack", "erie"], ["adirondack", "fundy"], ["adirondack", "helluland"], ["adirondack", "huron"], ["adirondack", "labrador"], ["adirondack", "micmac"], ["adirondack", "muskeg"], ["adirondack", "tunu"], ["adirondack", "winnipeg"], ["adirondack", "yucatan"], ["aleut", "illinois"], ["aleut", "keewatin"], ["aleut", "labrador"], ["alor", "borneo"], ["alor", "macquarie"], ["alor", "mentawai"], ["alor", "punjab"], ["alor", "sundaland"], ["alor", "tasman"], ["alor", "uluru"], ["alor", "zealandia"], ["altiplano", "chaco"], ["altiplano", "magellan"], ["altiplano", "parana"], ["altiplano", "peninsula"], ["altiplano", "tocantins"], ["amur", "hokkaido"], ["amur", "kamchatka"], ["amur", "kuril"], ["amur", "sakhalin"], ["amur", "tuva"], ["amur", "udege"], ["amur", "yakutia"], ["annam", "borneo"], ["annam", "irrawaddy"], ["annam", "kashmir"], ["annam", "koryak"], ["annam", "magadan"], ["annam", "malaya"], ["annam", "punjab"], ["annam", "sundaland"], ["annam", "timor"], ["annam", "ulaan"], ["annam", "zealandia"], ["aotearoa", "barrier"], ["aotearoa", "coral"], ["aotearoa", "sahul"], ["aotearoa", "tasman"], ["aotearoa", "tasmania"], ["appalachia", "cascades"], ["appalachia", "hawaii"], ["appalachia", "labrador"], ["appalachia", "olmec"], ["appalachia", "rockies"], ["appalachia", "sakhalin"], ["appalachia", "sierra"], ["appalachia", "toltec"], ["aquitaine", "caledonia"], ["aquitaine", "carpathian"], ["aquitaine", "doggerland"], ["aquitaine", "hoggar"], ["aquitaine", "nile"], ["aquitaine", "noricum"], ["aquitaine", "parthia"], ["aquitaine", "rift"], ["aquitaine", "urartu"], ["araguaia", "araucania"], ["araguaia", "chubut"], ["araguaia", "guapore"], ["araguaia", "olmec"], ["araguaia", "parana"], ["araucania", "arawak"], ["araucania", "atacama"], ["araucania", "caribbean"], ["araucania", "chaco"], ["araucania", "guapore"], ["araucania", "miskito"], ["araucania", "panama"], ["araucania", "paria"], ["araucania", "volcan"], ["arawak", "bimini"], ["arawak", "calusa"], ["arawak", "cerrado"], ["arawak", "ciboney"], ["arawak", "erie"], ["arawak", "helluland"], ["arawak", "illinois"], ["arawak", "mayan"], ["arawak", "miskito"], ["arawak", "orinoco"], ["arawak", "panama"], ["arawak", "rockies"], ["arawak", "tehuantepec"], ["arawak", "volcan"], ["armorica", "atlas"], ["armorica", "baffin"], ["armorica", "doggerland"], ["armorica", "fundy"], ["armorica", "noricum"], ["armorica", "nunavut"], ["arnhem", "carpentaria"], ["arnhem", "chatham"], ["arnhem", "tasmania"], ["asgard", "berkner"], ["asgard", "filchner"], ["asgard", "maud"], ["asgard", "oates"], ["asgard", "pennell"], ["asgard", "ronne"], ["asgard", "siple"], ["asgard", "thurston"], ["asgard", "vinson"], ["atacama", "cerrado"], ["atacama", "chubut"], ["atacama", "guapore"], ["atacama", "magellan"], ["atacama", "pampas"], ["atacama", "parana"], ["atacama", "patagonia"], ["atacama", "peninsula"], ["atacama", "plata"], ["atacama", "tocantins"], ["atlantis", "helvetia"], ["atlantis", "lusitania"], ["atlantis", "sarmatia"], ["atlantis", "tuva"], ["atlas", "carpathian"], ["atlas", "gaetulia"], ["atlas", "hoggar"], ["atlas", "nubia"], ["baffin", "calusa"], ["baffin", "ciboney"], ["baffin", "illinois"], ["baffin", "iroquois"], ["baffin", "lucayan"], ["baffin", "micmac"], ["baffin", "newfoundland"], ["baffin", "scoresby"], ["baffin", "tequesta"], ["baffin", "timucua"], ["baffin", "yucatan"], ["barrier", "melanesia"], ["barrier", "outback"], ["barrier", "sahul"], ["barrier", "tasmania"], ["bechuana", "drakensberg"], ["bechuana", "limpopo"], ["bechuana", "mashona"], ["bechuana", "maud"], ["bechuana", "namaqua"], ["bechuana", "siple"], ["bechuana", "transvaal"], ["bechuana", "vinson"], ["bengal", "borneo"], ["bengal", "kashmir"], ["bengal", "kimberley"], ["bengal", "malaya"], ["bengal", "mentawai"], ["bengal", "oroqen"], ["bengal", "papua"], ["bengal", "timor"], ["bengal", "ulaan"], ["bengal", "zealandia"], ["beringia", "cascades"], ["beringia", "columbia"], ["beringia", "rockies"], ["beringia", "sakhalin"], ["berkner", "filchner"], ["berkner", "getz"], ["berkner", "pennell"], ["bimini", "calusa"], ["bimini", "caribbean"], ["bimini", "fram"], ["bimini", "lucayan"], ["bimini", "mackenzie"], ["bimini", "maui"], ["bimini", "paria"], ["bimini", "scoresby"], ["bimini", "tequesta"], ["bimini", "toltec"], ["bimini", "volcan"], ["borneo", "chatham"], ["borneo", "deccan"], ["borneo", "flores"], ["borneo", "najd"], ["borneo", "papua"], ["borneo", "punjab"], ["borneo", "timor"], ["borneo", "zealandia"], ["caledonia", "fundy"], ["caledonia", "helvetia"], ["caledonia", "huron"], ["caledonia", "jutland"], ["caledonia", "kamchatka"], ["caledonia", "lusitania"], ["caledonia", "muskeg"], ["caledonia", "tuva"], ["calusa", "erie"], ["calusa", "timucua"], ["calusa", "tunu"], ["calusa", "yucatan"], ["cappadocia", "deccan"], ["cappadocia", "kashmir"], ["cappadocia", "limpopo"], ["cappadocia", "malaya"], ["cappadocia", "mashona"], ["cappadocia", "najd"], ["cappadocia", "sumer"], ["cappadocia", "zambezi"], ["caribbean", "ciboney"], ["caribbean", "guiana"], ["caribbean", "helluland"], ["caribbean", "lucayan"], ["caribbean", "olmec"], ["caribbean", "orinoco"], ["caribbean", "panama"], ["caribbean", "tehuantepec"], ["caribbean", "toltec"], ["carpathian", "fundy"], ["carpathian", "helvetia"], ["carpathian", "lusitania"], ["carpathian", "muskeg"], ["carpathian", "nunavut"], ["carpathian", "tibesti"], ["carpentaria", "chatham"], ["carpentaria", "loyalty"], ["carpentaria", "outback"], ["carpentaria", "tasman"], ["carpentaria", "uluru"], ["cascades", "hawaii"], ["cascades", "keewatin"], ["cascades", "mackenzie"], ["cerrado", "chaco"], ["cerrado", "guapore"], ["cerrado", "guiana"], ["cerrado", "lucayan"], ["cerrado", "miskito"], ["cerrado", "orinoco"], ["cerrado", "pampas"], ["cerrado", "panama"], ["cerrado", "parana"], ["cerrado", "paria"], ["cerrado", "volcan"], ["chaco", "patagonia"], ["chatham", "flores"], ["chatham", "macquarie"], ["chatham", "melanesia"], ["chatham", "punjab"], ["chatham", "sundaland"], ["chatham", "timor"], ["chesapeake", "illinois"], ["chesapeake", "iroquois"], ["chubut", "guapore"], ["chubut", "guiana"], ["chubut", "orinoco"], ["chubut", "pampas"], ["chubut", "panama"], ["chubut", "parana"], ["chubut", "paria"], ["chukotka", "heilong"], ["chukotka", "jeju"], ["chukotka", "kamchatka"], ["chukotka", "nanai"], ["chukotka", "okhotsk"], ["chukotka", "tuva"], ["chukotka", "udege"], ["chukotka", "yenisei"], ["ciboney", "cuba"], ["ciboney", "fram"], ["ciboney", "helluland"], ["ciboney", "tequesta"], ["coats", "drake"], ["coats", "fuegia"], ["coats", "ronne"], ["coats", "tocantins"], ["columbia", "keewatin"], ["columbia", "labrador"], ["columbia", "laurentide"], ["columbia", "mackenzie"], ["columbia", "rockies"], ["coral", "kimberley"], ["coral", "loyalty"], ["coral", "outback"], ["coral", "sahul"], ["coral", "tasmania"], ["coral", "uluru"], ["cuba", "fram"], ["cuba", "maui"], ["cuba", "miskito"], ["cuba", "paria"], ["cuba", "sierra"], ["cuba", "tequesta"], ["cuba", "volcan"], ["cuba", "yucatan"], ["dakota", "helluland"], ["dakota", "jeju"], ["dakota", "keewatin"], ["dakota", "rockies"], ["dakota", "sakhalin"], ["dakota", "toltec"], ["dakota", "yukon"], ["deccan", "irrawaddy"], ["deccan", "mentawai"], ["deccan", "sahel"], ["deccan", "sumer"], ["deccan", "sundaland"], ["doggerland", "huron"], ["doggerland", "jutland"], ["doggerland", "lusitania"], ["doggerland", "muskeg"], ["doggerland", "noricum"], ["doggerland", "sarmatia"], ["doggerland", "tunu"], ["drake", "larsen"], ["drake", "magellan"], ["drake", "pampas"], ["drake", "peninsula"], ["drake", "ronne"], ["drake", "tocantins"], ["drakensberg", "filchner"], ["drakensberg", "highveld"], ["drakensberg", "lesotho"], ["drakensberg", "namib"], ["drakensberg", "natal"], ["ellsworth", "getz"], ["ellsworth", "maud"], ["ellsworth", "oates"], ["ellsworth", "pennell"], ["ellsworth", "ross"], ["ellsworth", "thurston"], ["ellsworth", "weddell"], ["erie", "fundy"], ["erie", "helluland"], ["erie", "huron"], ["erie", "iroquois"], ["erie", "keewatin"], ["erie", "labrador"], ["erie", "muskeg"], ["erie", "olmec"], ["erie", "toltec"], ["erie", "tunu"], ["erie", "winnipeg"], ["fezzan", "mashona"], ["fezzan", "okavango"], ["fezzan", "rift"], ["fezzan", "tibesti"], ["filchner", "ronne"], ["filchner", "thurston"], ["flores", "papua"], ["flores", "punjab"], ["flores", "sundaland"], ["flores", "timor"], ["flores", "uluru"], ["flores", "zealandia"], ["fram", "illinois"], ["fram", "iroquois"], ["fram", "ontario"], ["fram", "paria"], ["fram", "timucua"], ["fuegia", "larsen"], ["fuegia", "magellan"], ["fuegia", "pampas"], ["fuegia", "peninsula"], ["fuegia", "weddell"], ["fundy", "labrador"], ["fundy", "lusitania"], ["fundy", "micmac"], ["fundy", "newfoundland"], ["fundy", "winnipeg"], ["gaetulia", "namib"], ["gaetulia", "nubia"], ["gaetulia", "okavango"], ["getz", "ross"], ["getz", "siple"], ["getz", "thurston"], ["guapore", "pampas"], ["guiana", "parana"], ["hawaii", "mackenzie"], ["hawaii", "mayan"], ["hawaii", "olmec"], ["hawaii", "rockies"], ["hawaii", "tehuantepec"], ["hawaii", "toltec"], ["hawaii", "volcan"], ["heilong", "iturup"], ["heilong", "kamchatka"], ["heilong", "kunashir"], ["heilong", "magadan"], ["heilong", "nanai"], ["heilong", "ulaan"], ["helluland", "illinois"], ["helluland", "keewatin"], ["helluland", "labrador"], ["helluland", "micmac"], ["helluland", "olmec"], ["helluland", "panama"], ["helluland", "prairie"], ["helluland", "toltec"], ["helluland", "winnipeg"], ["helluland", "yucatan"], ["helvetia", "jutland"], ["highveld", "karoo"], ["highveld", "limpopo"], ["highveld", "mashona"], ["highveld", "namib"], ["highveld", "natal"], ["highveld", "nyasa"], ["highveld", "okavango"], ["hoggar", "parthia"], ["hoggar", "rift"], ["hoggar", "sarmatia"], ["hoggar", "urartu"], ["hokkaido", "jeju"], ["hokkaido", "kuril"], ["hokkaido", "okhotsk"], ["hokkaido", "ulaan"], ["huron", "labrador"], ["huron", "micmac"], ["huron", "newfoundland"], ["huron", "nunavut"], ["illinois", "laurentide"], ["illinois", "newfoundland"], ["illinois", "scoresby"], ["illinois", "tunu"], ["illinois", "winnipeg"], ["iroquois", "labrador"], ["iroquois", "laurentide"], ["iroquois", "newfoundland"], ["iroquois", "scoresby"], ["irrawaddy", "malaya"], ["irrawaddy", "mentawai"], ["irrawaddy", "punjab"], ["irrawaddy", "ulaan"], ["iturup", "jeju"], ["iturup", "koryak"], ["iturup", "magadan"], ["iturup", "nanai"], ["iturup", "okhotsk"], ["iturup", "sakhalin"], ["iturup", "udege"], ["jeju", "kuril"], ["jeju", "magadan"], ["jeju", "nanai"], ["jeju", "udege"], ["jeju", "yukon"], ["jutland", "noricum"], ["jutland", "sarmatia"], ["jutland", "yenisei"], ["kamchatka", "okhotsk"], ["kamchatka", "sarmatia"], ["kamchatka", "yenisei"], ["karoo", "mashona"], ["karoo", "natal"], ["karoo", "nyasa"], ["kashmir", "mentawai"], ["kashmir", "sundaland"], ["kashmir", "zealandia"], ["keewatin", "labrador"], ["keewatin", "micmac"], ["keewatin", "yukon"], ["kimberley", "malaya"], ["kimberley", "sahul"], ["kimberley", "sundaland"], ["kimberley", "zealandia"], ["koryak", "nanai"], ["koryak", "oroqen"], ["koryak", "ryukyu"], ["kunashir", "kuril"], ["kunashir", "nanai"], ["kunashir", "okhotsk"], ["kunashir", "ryukyu"], ["kunashir", "sakhalin"], ["kuril", "nanai"], ["kuril", "okhotsk"], ["labrador", "micmac"], ["labrador", "muskeg"], ["labrador", "nunavut"], ["larsen", "thurston"], ["larsen", "weddell"], ["laurentide", "prairie"], ["laurentide", "rockies"], ["lesotho", "limpopo"], ["lesotho", "madagascar"], ["lesotho", "mashona"], ["lesotho", "najd"], ["lesotho", "namaqua"], ["lesotho", "natal"], ["lesotho", "rift"], ["lesotho", "sahel"], ["lesotho", "sumer"], ["limpopo", "madagascar"], ["limpopo", "mashona"], ["limpopo", "nyasa"], ["limpopo", "transvaal"], ["limpopo", "zambezi"], ["loyalty", "outback"], ["loyalty", "tasman"], ["lucayan", "scoresby"], ["lucayan", "tequesta"], ["lucayan", "volcan"], ["lusitania", "muskeg"], ["lusitania", "sarmatia"], ["mackenzie", "prairie"], ["mackenzie", "rockies"], ["mackenzie", "sierra"], ["mackenzie", "toltec"], ["mackenzie", "yukon"], ["macquarie", "outback"], ["macquarie", "sahul"], ["macquarie", "sundaland"], ["macquarie", "tasman"], ["macquarie", "timor"], ["madagascar", "zambezi"], ["magadan", "okhotsk"], ["magadan", "oroqen"], ["magadan", "ryukyu"], ["magadan", "sakhalin"], ["magadan", "udege"], ["magellan", "pampas"], ["magellan", "parana"], ["magellan", "plata"], ["magellan", "weddell"], ["malaya", "mentawai"], ["malaya", "najd"], ["malaya", "sahel"], ["malaya", "sumer"], ["malaya", "sundaland"], ["malaya", "zealandia"], ["mashona", "namib"], ["mashona", "natal"], ["mashona", "nubia"], ["mashona", "zambezi"], ["maud", "nyasa"], ["maud", "pennell"], ["maud", "ronne"], ["maud", "siple"], ["maud", "thurston"], ["maud", "vinson"], ["maui", "mayan"], ["maui", "miskito"], ["maui", "olmec"], ["maui", "panama"], ["maui", "sierra"], ["maui", "toltec"], ["maui", "volcan"], ["mayan", "miskito"], ["mayan", "orinoco"], ["mayan", "toltec"], ["mayan", "volcan"], ["mayan", "yucatan"], ["melanesia", "outback"], ["melanesia", "papua"], ["melanesia", "sahul"], ["melanesia", "tasmania"], ["melanesia", "timor"], ["melanesia", "uluru"], ["melanesia", "zealandia"], ["mentawai", "najd"], ["mentawai", "punjab"], ["mentawai", "timor"], ["micmac", "muskeg"], ["micmac", "newfoundland"], ["micmac", "ontario"], ["micmac", "winnipeg"], ["miskito", "tehuantepec"], ["muskeg", "nunavut"], ["muskeg", "winnipeg"], ["namaqua", "natal"], ["namaqua", "nubia"], ["namaqua", "zambezi"], ["namib", "rift"], ["namib", "zambezi"], ["nanai", "okhotsk"], ["nanai", "sakhalin"], ["nanai", "udege"], ["nanai", "ulaan"], ["natal", "siple"], ["natal", "transvaal"], ["natal", "zambezi"], ["newfoundland", "nunavut"], ["newfoundland", "ontario"], ["nile", "parthia"], ["nile", "sumer"], ["nile", "tibesti"], ["noricum", "nunavut"], ["nubia", "rift"], ["nubia", "tibesti"], ["nunavut", "winnipeg"], ["nyasa", "shirase"], ["nyasa", "siple"], ["nyasa", "transvaal"], ["nyasa", "vinson"], ["oates", "siple"], ["okavango", "transvaal"], ["okavango", "zambezi"], ["okhotsk", "ulaan"], ["okhotsk", "yakutia"], ["olmec", "orinoco"], ["olmec", "toltec"], ["orinoco", "tehuantepec"], ["outback", "papua"], ["outback", "sahul"], ["outback", "zealandia"], ["pampas", "patagonia"], ["pampas", "peninsula"], ["pampas", "tocantins"], ["panama", "paria"], ["panama", "tehuantepec"], ["panama", "toltec"], ["panama", "volcan"], ["panama", "yucatan"], ["papua", "punjab"], ["papua", "sundaland"], ["papua", "zealandia"], ["parana", "peninsula"], ["parana", "plata"], ["paria", "tequesta"], ["paria", "volcan"], ["paria", "yucatan"], ["parthia", "sarmatia"], ["parthia", "sumer"], ["patagonia", "tocantins"], ["pennell", "ross"], ["pennell", "shirase"], ["plata", "tocantins"], ["plata", "weddell"], ["prairie", "rockies"], ["punjab", "ulaan"], ["punjab", "uluru"], ["rift", "tibesti"], ["rockies", "sierra"], ["rockies", "yucatan"], ["ronne", "vinson"], ["ronne", "weddell"], ["ross", "shirase"], ["ryukyu", "sakhalin"], ["ryukyu", "yukon"], ["sahul", "tasman"], ["sahul", "uluru"], ["sahul", "zealandia"], ["sarmatia", "tibesti"], ["sarmatia", "tuva"], ["sarmatia", "urartu"], ["sarmatia", "yenisei"], ["scoresby", "tequesta"], ["scoresby", "timucua"], ["scoresby", "tunu"], ["sierra", "tehuantepec"], ["sierra", "toltec"], ["sierra", "volcan"], ["sierra", "yukon"], ["sumer", "urartu"], ["sundaland", "timor"], ["sundaland", "zealandia"], ["tasman", "timor"], ["tehuantepec", "toltec"], ["tehuantepec", "volcan"], ["tehuantepec", "yucatan"], ["tibesti", "timucua"], ["tibesti", "urartu"], ["timor", "zealandia"], ["tocantins", "weddell"], ["toltec", "yucatan"], ["transvaal", "zambezi"], ["tuva", "udege"], ["tuva", "yakutia"], ["vinson", "weddell"], ["volcan", "yucatan"], ["yakutia", "yenisei"]] as [string, string][];

function undirected(edges: [string, string][]) {
  const map = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    if (!map.has(a)) map.set(a, new Set());
    map.get(a)!.add(b);
  };
  for (const [a, b] of edges) { add(a, b); add(b, a); }
  return map;
}

export const LAND_NEIGHBORS = undirected(LAND_EDGES);
export const SEA_NEIGHBORS = undirected(SEA_EDGES);

export function landNeighbors(id: string): string[] {
  return [...(LAND_NEIGHBORS.get(id) ?? [])];
}

export function seaNeighbors(id: string): string[] {
  return [...(SEA_NEIGHBORS.get(id) ?? [])];
}

export function continentTerritories(continent: string) {
  return TERRITORIES.filter((t) => t.continent === continent);
}
