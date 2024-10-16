const { app, BrowserWindow, Menu } = require('electron/main');
const path = require('node:path');
const { createTable,
        insertProduct,
        getAllProducts,
        updateProduct,
        deleteProduct,
        getProductByBarcode,
        insertSale,
        createSalesTable,
        createSaleProductsTable,
        getSalesWithDetails,
        getSalesByDate,
        searchProducts,
        createPromoProductsTable,
        createPromosTable,
        addPromo,
        getPromosWithProducts,
        searchPromos,
        deletePromo,
        createSaleAmountsTable,
        createSalePromosTable,
        getProductsByPromo,
        createExpressPromosTable,
        insertExpressPromo,
        getExpressPromosBySaleId
      } = require('./db/db');
const { ipcMain } = require('electron');

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // Menu.setApplicationMenu(null);
  win.maximize();
  win.loadFile(path.join(__dirname, '../dist/moe-erp/browser/index.csr.html'));
}

app.whenReady().then(() => {
  createWindow()
  createTable();
  createSalesTable();
  createSaleProductsTable();
  createPromosTable();
  createPromoProductsTable();
  createSaleAmountsTable();
  createSalePromosTable();
  createExpressPromosTable();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.on('insert-product', (event, product) => {
  insertProduct(product.name, product.price, product.sellPrice, product.stock, product.barcode, product.brand, product.stock_limit);
  event.reply('product-inserted', 'Producto insertado correctamente');
});

ipcMain.on('get-products', (event) => {
  getAllProducts((err, products) => {
    if (err) {
        console.error('Error retrieving products:', err.message);
        event.reply('get-products-response', { success: false, error: err.message });
    } else {
        event.reply('get-products-response', { success: true, data: products });
    }
  });
});

ipcMain.on('update-product', (event, product) => {
  updateProduct(product.id, product.name, product.price, product.sellPrice, product.stock, product.barcode, product.brand, product.stock_limit);
  event.reply('product-updated', `Producto con ID ${product.id} actualizado correctamente`);
});

ipcMain.on('delete-product', (event, productId) => {
  deleteProduct(productId);
  event.reply('product-deleted', `Producto con ID ${productId} eliminado correctamente`);
});

ipcMain.on('get-product-by-barcode', (event, productBarcode) => {
  getProductByBarcode(productBarcode, (err, product) => {
    if (err) {
        console.error('Error retrieving products:', err.message);
        event.reply('get-product-by-barcode-response', { success: false, error: err.message });
    } else {
        event.reply('get-product-by-barcode-response', { success: true, data: product });
    }
  });
});

ipcMain.on('insert-sale', (event, sale) => {
  insertSale(sale, (err) => {
    if (err) {
        console.error('Error al registrar la venta:', err);
    } else {
        console.log('Venta registrada y stock actualizado con éxito');
    }
});
  event.reply('insert-sale-response', 'Venta insertada correctamente');
});

ipcMain.on('get-sales', (event) => {
  getSalesWithDetails((err, sales) => {
    if (err) {
        console.error('Error retrieving sales:', err.message);
        event.reply('get-sales-response', { success: false, error: err.message });
    } else {
        event.reply('get-sales-response', { success: true, data: sales });
    }
  });
});

ipcMain.on('get-sales-by-date', (event, date) => {
  getSalesByDate(date, (err, sales) => {
    if (err) {
      event.reply('get-sales-by-date-response', { success: false, error: 'Error al obtener ventas por fecha: ' + err.message });
    } else {
      event.reply('get-sales-by-date-response', { success: true, data: sales });
    }
  });
});

ipcMain.on('search-products', (event, query) => {
  searchProducts(query, (err, results) => {
    if (err) {
      event.reply('search-products-response', { success: false, error: 'Error al obtener búsqueda de productos: ' + err.message });
    } else {
      event.reply('search-products-response', { success: true, data: results });
    }
  });
});

ipcMain.on('search-products-2', (event, query) => {
  searchProducts(query, (err, results) => {
    if (err) {
      event.reply('search-products-2-response', { success: false, error: 'Error al obtener búsqueda de productos: ' + err.message });
    } else {
      event.reply('search-products-2-response', { success: true, data: results });
    }
  });
});

ipcMain.on('get-promos', (event) => {
  getPromosWithProducts((err, promos) => {
    if (err) {
        console.error('Error retrieving promos:', err.message);
        event.reply('get-promos-response', { success: false, error: err.message });
    } else {
        event.reply('get-promos-response', { success: true, data: promos });
    }
  });
});

ipcMain.on('add-promo', (event, promo) => {
  addPromo(promo, (err) => {
    if (err) {
        console.error('Error al registrar promo:', err.message);
        event.reply('add-promo-response', 'Error al registrar la promo');
    } else {
        console.log('Promo agregada correctamente')
        event.reply('add-promo-response', 'Promo agregada correctamente');
    }
  });
});

ipcMain.on('search-promos', (event, query) => {
  searchPromos(query, (err, results) => {
    if (err) {
      event.reply('search-promos-response', { success: false, error: 'Error al obtener búsqueda de promos: ' + err.message });
    } else {
      event.reply('search-promos-response', { success: true, data: results });
    }
  });
});

ipcMain.on('delete-promo', (event, promoId) => {
  deletePromo(promoId, (err) => {
    if (err) {
      event.reply('delete-promo-response', { success: false, error: 'Error al eliminar promo: ' + err.message });
    } else {
      event.reply('delete-promo-response', { success: true, data: 'Promo eliminada correctamente' });
    }
  });
});

ipcMain.on('get-products-by-promo', (event, promoId) => {
  getProductsByPromo(promoId, (err, sales) => {
    if (err) {
      event.reply('get-products-by-promo-response', { success: false, error: 'Error al obtener ventas por fecha: ' + err.message });
    } else {
      event.reply('get-products-by-promo-response', { success: true, data: sales });
    }
  });
});

ipcMain.on('search-products-for-express-promo', (event, query) => {
  searchProducts(query, (err, results) => {
    if (err) {
      event.reply('search-products-for-express-promo-response', { success: false, error: 'Error al obtener búsqueda de productos para promo expresssssss: ' + err.message });
    } else {
      event.reply('search-products-for-express-promo-response', { success: true, data: results });
    }
  });
});

ipcMain.on('get-product-by-barcode-for-express-promo', (event, productBarcode) => {
  getProductByBarcode(productBarcode, (err, product) => {
    if (err) {
        console.error('Error retrieving products for express promo:', err.message);
        event.reply('get-product-by-barcode-for-express-promo-response', { success: false, error: err.message });
    } else {
        event.reply('get-product-by-barcode-for-express-promo-response', { success: true, data: product });
    }
  });
});

ipcMain.on('search-products-for-express-promo', (event, query) => {
  searchProducts(query, (err, results) => {
    if (err) {
      event.reply('search-products-for-express-promo-response', { success: false, error: 'Error al obtener búsqueda de productos para promo express: ' + err.message });
    } else {
      event.reply('search-products-for-express-promo-response', { success: true, data: results });
    }
  });
});

ipcMain.on('insert-express-promo', (event, saleId, total) => {
  insertExpressPromo(saleId, total, (err) => {
    if (err) {
      console.error('Error al registrar promo express:', err.message);
      event.reply('add-promo-response', 'Error al registrar la promo');
    } else {
      console.log('Promo express agregada correctamente')
      event.reply('add-promo-response', 'Promo agregada correctamente');
    }
  });
});