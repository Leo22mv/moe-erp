const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'db.sqlite3');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al abrir la base de datos:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite');
    }
});

function createTable() {
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        sellPrice REAL NOT NULL,
        stock INTEGER NOT NULL,
        barcode TEXT UNIQUE,
        brand TEXT,
        stock_limit INTEGER NOT NULL
    )`, (err) => {
        if (err) {
            console.error('Error al crear la tabla:', err.message);
        } else {
            console.log('Tabla de productos creada o existente');
        }
    });
}

function insertProduct(name, price, sellPrice, stock, barcode, brand, stock_limit) {
    const query = `INSERT INTO products (name, price, sellPrice, stock, barcode, brand, stock_limit) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(query, [name, price, sellPrice, stock, barcode, brand, stock_limit], function(err) {
        if (err) {
            console.error('Error al insertar producto:', err.message);
            console.log(name, price, sellPrice, stock, barcode, brand, stock_limit);
        } else {
            console.log(`Producto agregado con ID: ${this.lastID}`);
        }
    });
}

function getAllProducts(callback) {
    const query = `SELECT * FROM products`;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener productos:', err.message);
            callback(err, null);
        } else {
            callback(null, rows);
        }
    });
}

function updateProduct(id, name, price, sellPrice, stock, barcode, brand, stock_limit) {
    const query = `UPDATE products SET name = ?, price = ?, sellPrice = ?, stock = ?, barcode = ?, brand = ?, stock_limit = ? WHERE id = ?`;
    db.run(query, [name, price, sellPrice, stock, barcode, brand, stock_limit, id], function(err) {
        if (err) {
            console.error('Error al actualizar producto:', err.message);
        } else {
            console.log(`Producto con ID: ${id} actualizado`);
        }
    });
}

function deleteProduct(id) {
    const query = `DELETE FROM products WHERE id = ?`;
    db.run(query, [id], function(err) {
        if (err) {
            console.error('Error al eliminar producto:', err.message);
        } else {
            console.log(`Producto con ID: ${id} eliminado`);
        }
    });
}

function createSalesTable() {
    db.run(`CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        total REAL NOT NULL
    )`, (err) => {
        if (err) {
            console.error('Error al crear la tabla de ventas:', err.message);
        } else {
            console.log('Tabla de ventas creada o existente');
        }
    });
}

function createSaleProductsTable() {
    db.run(`CREATE TABLE IF NOT EXISTS sale_products (
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id),
        FOREIGN KEY (product_id) REFERENCES products(id),
        PRIMARY KEY (sale_id, product_id)
    )`, (err) => {
        if (err) {
            console.error('Error al crear la tabla intermedia de venta-producto:', err.message);
        } else {
            console.log('Tabla intermedia de venta-producto creada o existente');
        }
    });
}

function insertSale(sale, callback) {
    const date = new Date().toISOString();
    const insertSaleQuery = `INSERT INTO sales (date, total) VALUES (?, ?)`;
    db.run(insertSaleQuery, [date, sale.total], function(err) {
        if (err) {
            console.error('Error al insertar venta:', err.message);
            callback(err);
            return;
        }

        const saleId = this.lastID;

        const insertSaleProductsQuery = `INSERT INTO sale_products (sale_id, product_id, quantity) VALUES (?, ?, ?)`;

        // Preparar las transacciones para actualizar el stock
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            sale.products.forEach(product => {
                // Insertar en sale_products
                db.run(insertSaleProductsQuery, [saleId, product.id, product.quantity], (err) => {
                    if (err) {
                        console.error('Error al insertar producto en la venta:', err.message);
                        db.run('ROLLBACK');
                        callback(err);
                        return;
                    }

                    // Actualizar stock
                    const updateStockQuery = `UPDATE products SET stock = stock - ? WHERE id = ?`;
                    db.run(updateStockQuery, [product.quantity, product.id], (err) => {
                        if (err) {
                            console.error('Error al actualizar stock:', err.message);
                            db.run('ROLLBACK');
                            callback(err);
                            return;
                        }
                    });
                });
            });

            // Finalizar la transacción
            db.run('COMMIT', (err) => {
                if (err) {
                    console.error('Error al confirmar transacción:', err.message);
                    callback(err);
                } else {
                    console.log(`Venta ${saleId} registrada con éxito`);
                    callback(null);
                }
            });
        });
    });
}

function getProductByBarcode(barcode, callback) {
    const query = `SELECT * FROM products WHERE barcode = ?`;
    db.get(query, [barcode], (err, row) => {
        if (err) {
            console.error('Error al obtener el producto por código de barras:', err.message);
            callback(err, null);
        } else {
            callback(null, row);
        }
    });
}

function getSalesWithDetails(callback) {
    const query = `
        SELECT 
            sales.id AS sale_id, 
            sales.date AS sale_date, 
            sales.total AS sale_total,
            products.id AS product_id,
            products.name AS product_name,
            products.price AS product_price,
            sale_products.quantity AS product_quantity
        FROM 
            sales
        INNER JOIN 
            sale_products ON sales.id = sale_products.sale_id
        INNER JOIN 
            products ON sale_products.product_id = products.id
        ORDER BY 
            sales.id, products.id
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener ventas con detalles:', err.message);
            callback(err, null);
        } else {
            const sales = {};

            rows.forEach(row => {
                if (!sales[row.sale_id]) {
                    sales[row.sale_id] = {
                        id: row.sale_id,
                        date: row.sale_date,
                        total: row.sale_total,
                        products: []
                    };
                }

                sales[row.sale_id].products.push({
                    id: row.product_id,
                    name: row.product_name,
                    price: row.product_price,
                    quantity: row.product_quantity
                });
            });

            const salesArray = Object.values(sales);
            callback(null, salesArray);
        }
    });
}

function getAllSales(callback) {
    const query = `SELECT * FROM sales ORDER BY id DESC`;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener ventas:', err.message);
            callback(err, null);
        } else {
            callback(null, rows);
        }
    });
}

const moment = require('moment-timezone');

function getSalesByDate(dateGMT3, callback) {
    const startOfDayGMT = moment.tz(dateGMT3, 'YYYY-MM-DD', 'America/Argentina/Buenos_Aires')
                                .startOf('day')
                                .utc()
                                .format('YYYY-MM-DD HH:mm:ss');
    const endOfDayGMT = moment.tz(dateGMT3, 'YYYY-MM-DD', 'America/Argentina/Buenos_Aires')
                              .endOf('day')
                              .utc()
                              .format('YYYY-MM-DD HH:mm:ss');

    const query = `SELECT * FROM sales WHERE date BETWEEN ? AND ?`;
    db.all(query, [startOfDayGMT, endOfDayGMT], (err, rows) => {
        if (err) {
            console.error('Error al obtener las ventas:', err.message);
            callback(err, null);
        } else {
            callback(null, rows);
        }
    });
}

function searchProducts(query, callback) {
    const searchQuery = `
        SELECT * FROM products 
        WHERE LOWER(name) LIKE ? OR LOWER(brand) LIKE ?
    `;
    const lowerQuery = query.toLowerCase();
    const searchParam = `%${lowerQuery}%`;
    db.all(searchQuery, [searchParam, searchParam], (err, rows) => {
        if (err) {
            console.error('Error al buscar productos:', err.message);
            callback(err, null);
        } else {
            callback(null, rows);
        }
    });
}


module.exports = {
    createTable,
    insertProduct,
    getAllProducts,
    updateProduct,
    deleteProduct,
    getProductByBarcode,
    createSalesTable,
    createSaleProductsTable,
    insertSale,
    getSalesWithDetails,
    getAllSales,
    getSalesByDate,
    searchProducts
};