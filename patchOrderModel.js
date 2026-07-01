const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend/src/modules/orders/order.model.js');
let content = fs.readFileSync(filePath, 'utf8');

// Change default unit from kg to pcs in orderLineSchema
content = content.replace(
  "    unit: {\r\n      type: String,\r\n      required: true,\r\n      default: 'kg',\r\n    },",
  "    unit: {\r\n      type: String,\r\n      required: true,\r\n      default: 'pcs',\r\n    },"
);

// Also try \n only in case file uses LF
content = content.replace(
  "    unit: {\n      type: String,\n      required: true,\n      default: 'kg',\n    },",
  "    unit: {\n      type: String,\n      required: true,\n      default: 'pcs',\n    },"
);

// Add variantSize and variantPackingType before closing of orderLineSchema
const specBlock_crlf = "    specifications: {\r\n      type: Map,\r\n      of: String,\r\n      default: {},\r\n    },\r\n  },\r\n  { _id: false }\r\n);";
const specBlockNew_crlf = "    specifications: {\r\n      type: Map,\r\n      of: String,\r\n      default: {},\r\n    },\r\n    variantSize: {\r\n      type: String,\r\n      default: '',\r\n    },\r\n    variantPackingType: {\r\n      type: String,\r\n      default: '',\r\n    },\r\n  },\r\n  { _id: false }\r\n);";

const specBlock_lf = "    specifications: {\n      type: Map,\n      of: String,\n      default: {},\n    },\n  },\n  { _id: false }\n);";
const specBlockNew_lf = "    specifications: {\n      type: Map,\n      of: String,\n      default: {},\n    },\n    variantSize: {\n      type: String,\n      default: '',\n    },\n    variantPackingType: {\n      type: String,\n      default: '',\n    },\n  },\n  { _id: false }\n);";

if (content.includes(specBlock_crlf)) {
  content = content.replace(specBlock_crlf, specBlockNew_crlf);
  console.log('Replaced CRLF version');
} else if (content.includes(specBlock_lf)) {
  content = content.replace(specBlock_lf, specBlockNew_lf);
  console.log('Replaced LF version');
} else {
  console.log('WARNING: could not find spec block to replace. Manual check needed.');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done patching order.model.js');
