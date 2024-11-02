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
        box_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        total REAL NOT NULL,
        FOREIGN KEY (box_id) REFERENCES boxes(box_id)
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
    const getMaxBoxIdQuery = `SELECT MAX(box_id) as maxBoxId FROM boxes`;

    db.get(getMaxBoxIdQuery, (err, row) => {
        if (err) {
            console.error('Error al obtener el box_id más alto:', err.message);
            callback(err);
            return;
        }

        const boxId = row ? row.maxBoxId : null;
        if (boxId === null) {
            console.error('No se encontró ningún box_id');
            callback(new Error('No se encontró ningún box_id'));
            return;
        }
    
        const date = moment().tz('America/Argentina/Buenos_Aires').format('DD/MM/YYYY HH:mm:ss');
        const insertSaleQuery = `INSERT INTO sales (date, total, box_id) VALUES (?, ?, ?)`;
        
        db.run(insertSaleQuery, [date, sale.total, boxId], function(err) {
            if (err) {
                console.error('Error al insertar venta:', err.message);
                callback(err);
                return;
            }

            const saleId = this.lastID;

            const insertSaleProductsQuery = `INSERT INTO sale_products (sale_id, product_id, quantity) VALUES (?, ?, ?)`;
            const insertSalePromosQuery = `INSERT INTO sale_promos (sale_id, promo_id, quantity) VALUES (?, ?, ?)`;
            const insertSaleAmountsQuery = `INSERT INTO sale_amounts (sale_id, amount, description) VALUES (?, ?, ?)`;
            const insertExpressPromosQuery = `INSERT INTO express_promos (sale_id, total) VALUES (?, ?)`;
            const updateBoxTotals = `UPDATE boxes SET box_total = box_total + ?, box_net_total = box_net_total + ? WHERE box_id = ?`;

            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                sale.products.forEach(product => {
                    if (product.isPromo) {
                        db.run(insertSalePromosQuery, [saleId, product.promoId, product.quantity], (err) => {
                            if (err) {
                                console.error('Error al insertar promo en la venta:', err.message);
                                db.run('ROLLBACK');
                                callback(err);
                                return;
                            }

                            product.productsInPromo.forEach(promoProduct => {
                                const updateStockQuery = `UPDATE products SET stock = stock - ? WHERE id = ?`;
                                db.run(updateStockQuery, [promoProduct.quantity, promoProduct.id], (err) => {
                                    if (err) {
                                        console.error('Error al actualizar stock de producto en la promo:', err.message);
                                        db.run('ROLLBACK');
                                        callback(err);
                                        return;
                                    }
                                });
                            });
                        });
                    } else {
                        db.run(insertSaleProductsQuery, [saleId, product.id, product.quantity], (err) => {
                            if (err) {
                                console.error('Error al insertar producto en la venta:', err.message);
                                db.run('ROLLBACK');
                                callback(err);
                                return;
                            }

                            const updateStockQuery = `UPDATE products SET stock = stock - ? WHERE id = ?`;
                            db.run(updateStockQuery, [product.quantity, product.id], (err) => {
                                if (err) {
                                    console.error('Error al actualizar stock de producto:', err.message);
                                    db.run('ROLLBACK');
                                    callback(err);
                                    return;
                                }
                            });
                        });
                    }
                });

                if (sale.amounts && sale.amounts.length > 0) {
                    // console.log(JSON.stringify(sale.amounts, null, 2));
                    sale.amounts.forEach(amount => {
                        db.run(insertSaleAmountsQuery, [saleId, amount.amount, amount.description || null], (err) => {
                            if (err) {
                                console.error('Error al insertar monto suelto:', err.message);
                                db.run('ROLLBACK');
                                callback(err);
                                return;
                            }
                        });
                    });
                }

                if (sale.expressPromos && sale.expressPromos.length > 0) {
                    sale.expressPromos.forEach(expressPromo => {
                        db.run(insertExpressPromosQuery, [saleId, expressPromo.total], (err) => {
                            if (err) {
                                console.error('Error al insertar promo express en la venta:', err.message);
                                db.run('ROLLBACK');
                                callback(err);
                                return;
                            }
                            expressPromo.products.forEach(promoProduct => {
                                const updateStockQuery = `UPDATE products SET stock = stock - ? WHERE id = ?`;
                                db.run(updateStockQuery, [promoProduct.quantity, promoProduct.id], (err) => {
                                    if (err) {
                                        console.error('Error al actualizar stock de producto en la promo express:', err.message);
                                        db.run('ROLLBACK');
                                        callback(err);
                                        return;
                                    }
                                });
                            });
                        });
                    });
                }

                db.run(updateBoxTotals, [sale.total, sale.total, boxId], (err) => {
                    if (err) {
                      console.error(err.message);
                    } else {
                      console.log(`Totales de caja ${boxId} actualizados correctamente`);
                    }
                });                  

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

// function getSalesByDate(dateGMT3, callback) {
//     const formattedDate = moment.tz(dateGMT3, 'America/Argentina/Buenos_Aires')
//                                 .format('M/D/YYYY');

//     const query = `
//         SELECT 
//             sales.id AS sale_id, 
//             sales.date AS sale_date, 
//             sales.total AS sale_total,
//             products.id AS product_id,
//             products.name AS product_name,
//             products.sellPrice AS product_price,
//             sale_products.quantity AS product_quantity
//         FROM 
//             sales
//         INNER JOIN 
//             sale_products ON sales.id = sale_products.sale_id
//         INNER JOIN 
//             products ON sale_products.product_id = products.id
//         WHERE 
//             sales.date LIKE ?
//         ORDER BY 
//             sales.id, products.id
//     `;

//     db.all(query, [`${formattedDate}%`], (err, rows) => {
//         if (err) {
//             console.error('Error al obtener ventas con detalles por fecha:', err.message);
//             callback(err, null);
//         } else {
//             const sales = {};

//             rows.forEach(row => {
//                 if (!sales[row.sale_id]) {
//                     sales[row.sale_id] = {
//                         id: row.sale_id,
//                         date: row.sale_date,
//                         total: row.sale_total,
//                         products: []
//                     };
//                 }

//                 sales[row.sale_id].products.push({
//                     id: row.product_id,
//                     name: row.product_name,
//                     price: row.product_price,
//                     quantity: row.product_quantity
//                 });
//             });

//             const salesArray = Object.values(sales);
//             callback(null, salesArray);
//             console.log(salesArray);
//         }
//     });
// }

function getSalesByDate(dateGMT3, callback) {
    const startOfDay = moment.tz(dateGMT3, 'America/Argentina/Buenos_Aires')
                             .startOf('day')
                             .format('YYYY-MM-DD HH:mm:ss');

    const endOfDay = moment.tz(dateGMT3, 'America/Argentina/Buenos_Aires')
                           .endOf('day')
                           .format('YYYY-MM-DD HH:mm:ss');

    const query = `
        SELECT 
            sales.id AS sale_id, 
            sales.date AS sale_date, 
            sales.total AS sale_total,

            products.id AS product_id,
            products.name AS product_name,
            products.sellPrice AS product_price,
            sale_products.quantity AS product_quantity,

            promos.id AS promo_id,
            promos.name AS promo_name,
            promos.price AS promo_price,
            sale_promos.quantity AS promo_quantity,

            sale_amounts.amount AS extra_amount,
            sale_amounts.description AS extra_description,

            express_promos.express_promo_id AS express_promo_id,
            express_promos.total AS express_promo_total

        FROM 
            sales
        LEFT JOIN 
            sale_products ON sales.id = sale_products.sale_id
        LEFT JOIN 
            products ON sale_products.product_id = products.id

        LEFT JOIN 
            sale_promos ON sales.id = sale_promos.sale_id
        LEFT JOIN 
            promos ON sale_promos.promo_id = promos.id

        LEFT JOIN 
            sale_amounts ON sales.id = sale_amounts.sale_id

        LEFT JOIN 
            express_promos ON sales.id = express_promos.sale_id

        WHERE 
            sales.date BETWEEN ? AND ?
        ORDER BY 
            sales.id, products.id, promos.id
    `;
    // console.log(startOfDay + ", " + endOfDay);

    db.all(query, [startOfDay, endOfDay], (err, rows) => {
        if (err) {
            console.error('Error al obtener ventas con detalles por fecha:', err.message);
            callback(err, null);
        } else {
            const sales = {};

            rows.forEach(row => {
                if (!sales[row.sale_id]) {
                    sales[row.sale_id] = {
                        id: row.sale_id,
                        date: row.sale_date,
                        total: row.sale_total,
                        products: [],
                        promos: [],
                        amounts: [],
                        expressPromos: []
                    };
                }

                if (row.product_id) {
                    sales[row.sale_id].products.push({
                        id: row.product_id,
                        name: row.product_name,
                        price: row.product_price,
                        quantity: row.product_quantity
                    });
                }

                if (row.promo_id) {
                    sales[row.sale_id].promos.push({
                        id: row.promo_id,
                        name: row.promo_name,
                        price: row.promo_price,
                        quantity: row.promo_quantity
                    });
                }

                if (row.extra_amount !== null) {
                    sales[row.sale_id].amounts.push({
                        amount: row.extra_amount,
                        description: row.extra_description
                    });
                }

                if (row.express_promo_id) {
                    sales[row.sale_id].expressPromos.push({
                        id: row.express_promo_id,
                        total: row.express_promo_total
                    });
                }
            });

            const salesArray = Object.values(sales);
            callback(null, salesArray);
            // console.log(salesArray);
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

function createPromosTable() {
    db.run(`CREATE TABLE IF NOT EXISTS promos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL
    )`, (err) => {
        if (err) {
            console.error('Error al crear la tabla promos:', err.message);
        } else {
            console.log('Tabla de promociones creada o existente');
        }
    });
}

function createPromoProductsTable() {
    db.run(`CREATE TABLE IF NOT EXISTS promo_products (
        promo_id INTEGER,
        product_id INTEGER,
        quantity INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (promo_id) REFERENCES promos(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    )`, (err) => {
        if (err) {
            console.error('Error al crear la tabla promo_products:', err.message);
        } else {
            console.log('Tabla de productos en promociones creada o existente');
        }
    });
}

function addPromo(promo, callback) {
    const promoQuery = `INSERT INTO promos (name, price) VALUES (?, ?)`;

    db.run(promoQuery, [promo.name, promo.price], function(err) {
        if (err) {
            console.error('Error al agregar la promoción:', err.message);
            callback(err);
        } else {
            const promoId = this.lastID;

            const productQuery = `INSERT INTO promo_products (promo_id, product_id, quantity) VALUES (?, ?, ?)`;
            promo.products.forEach((product) => {
                db.run(productQuery, [promoId, product.id, product.quantity], (err) => {
                    if (err) {
                        console.error('Error al agregar producto a la promoción:', err.message);
                    }
                });
            });

            callback(null, promoId);
        }
    });
}

function getPromosWithProducts(callback) {
    const query = `
        SELECT p.id AS promo_id, p.name AS promo_name, p.price AS promo_price, 
               prod.id AS product_id, prod.name AS product_name, pp.quantity AS quantity
        FROM promos p
        LEFT JOIN promo_products pp ON p.id = pp.promo_id
        LEFT JOIN products prod ON pp.product_id = prod.id`;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener las promociones:', err.message);
            callback(err, null);
        } else {
            // Agrupar las promociones por sus productos y cantidades
            const promos = {};
            rows.forEach(row => {
                if (!promos[row.promo_id]) {
                    promos[row.promo_id] = {
                        id: row.promo_id,
                        name: row.promo_name,
                        price: row.promo_price,
                        products: []
                    };
                }

                // Si existe un producto asociado, lo agregamos a la lista
                if (row.product_id) {
                    promos[row.promo_id].products.push({
                        id: row.product_id,
                        name: row.product_name,
                        quantity: row.quantity
                    });
                }
            });

            callback(null, Object.values(promos));
        }
    });
}

function searchPromos(query, callback) {
    const searchQuery = `
        SELECT * FROM promos 
        WHERE LOWER(name) LIKE ?
    `;
    const lowerQuery = query.toLowerCase();
    const searchParam = `%${lowerQuery}%`;
    db.all(searchQuery, [searchParam], (err, rows) => {
        if (err) {
            console.error('Error al buscar promos:', err.message);
            callback(err, null);
        } else {
            callback(null, rows);
        }
    });
}

function deletePromo(promoId, callback) {
    const deleteProductsQuery = `DELETE FROM promo_products WHERE promo_id = ?`;

    db.run(deleteProductsQuery, [promoId], function(err) {
        if (err) {
            console.error('Error al eliminar productos de la promoción:', err.message);
            callback(err);
        } else {
            const deletePromoQuery = `DELETE FROM promos WHERE id = ?`;

            db.run(deletePromoQuery, [promoId], function(err) {
                if (err) {
                    console.error('Error al eliminar la promoción:', err.message);
                    callback(err);
                } else {
                    console.log(`Promoción con ID: ${promoId} eliminada`);
                    callback(null);
                }
            });
        }
    });
}

function createSalePromosTable() {
    db.run(`CREATE TABLE IF NOT EXISTS sale_promos (
        sale_id INTEGER,
        promo_id INTEGER,
        quantity INTEGER,
        FOREIGN KEY (sale_id) REFERENCES sales(id),
        FOREIGN KEY (promo_id) REFERENCES promos(id)
    )`, (err) => {
        if (err) {
            console.error('Error al crear la tabla:', err.message);
        } else {
            console.log('Tabla de promociones en ventas creada o existente');
        }
    });
}

function createSaleAmountsTable() {
    db.run(`CREATE TABLE IF NOT EXISTS sale_amounts (
        sale_id INTEGER,
        amount REAL NOT NULL,
        description TEXT,
        FOREIGN KEY (sale_id) REFERENCES sales(id)
    )`, (err) => {
        if (err) {
            console.error('Error al crear la tabla:', err.message);
        } else {
            console.log('Tabla de montos en ventas creada o existente');
        }
    });
}

function getProductsByPromo(promoId, callback) {
    const query = `SELECT * FROM promo_products WHERE promo_id = ?`;
    db.all(query, [promoId], (err, rows) => {
        if (err) {
            console.error('Error al obtener productos por por promoción:', err.message);
            callback(err, null);
        } else {
            callback(null, rows);
        }
    });
}

function createExpressPromosTable() {
    db.run(`CREATE TABLE IF NOT EXISTS express_promos (
        express_promo_id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER,
        total INTEGER,
        FOREIGN KEY (sale_id) REFERENCES sales(id)
    )`, (err) => {
        if (err) {
            console.error('Error al crear la tabla de promociones express en ventas:', err.message);
        } else {
            console.log('Tabla de promociones express en ventas creada o existente');
        }
    });
}

function insertExpressPromo(saleId, total, callback) {
    const query = `INSERT INTO express_promos (sale_id, total) VALUES (?, ?)`;

    db.run(query, [saleId, total], function(err) {
        if (err) {
            console.error('Error al insertar promo express en venta:', err.message);
            callback(err);
        } else {
            console.log(`Promo express insertada con éxito en la venta ${saleId}`);
            callback(null, { expressPromoId: this.lastID });
        }
    });
}

function getExpressPromosBySaleId(saleId, callback) {
    const query = `SELECT * FROM sale_express_promos WHERE sale_id = ?`;

    db.all(query, [saleId], (err, rows) => {
        if (err) {
            console.error('Error al obtener las promos express para la venta:', err.message);
            callback(err, null);
        } else {
            callback(null, rows);
        }
    });
}

function updatePromo(promo, callback) {
    const promoQuery = `UPDATE promos SET name = ?, price = ? WHERE id = ?`;
    
    db.run(promoQuery, [promo.name, promo.price, promo.id], function(err) {
        if (err) {
            console.error('Error al actualizar la promoción:', err.message);
            callback(err);
        } else {
            const deleteQuery = `DELETE FROM promo_products WHERE promo_id = ?`;
            db.run(deleteQuery, [promo.id], function(err) {
                if (err) {
                    console.error('Error al eliminar productos de la promoción:', err.message);
                    callback(err);
                } else {
                    const productQuery = `INSERT INTO promo_products (promo_id, product_id, quantity) VALUES (?, ?, ?)`;
                    promo.products.forEach((product) => {
                        db.run(productQuery, [promo.id, product.id, product.quantity], (err) => {
                            if (err) {
                                console.error('Error al agregar producto a la promoción:', err.message);
                            }
                        });
                    });
                    
                    callback(null, promo.id);
                }
            });
        }
    });
}

function createBoxesTable() {
    db.run(`CREATE TABLE IF NOT EXISTS boxes (
        box_id INTEGER PRIMARY KEY AUTOINCREMENT,
        box_date TEXT NOT NULL,
        box_total INTEGER,
        box_net_total INTEGER
    )`, (err) => {
        if (err) {
            console.error('Error al crear la tabla de cajas:', err.message);
        } else {
            console.log('Tabla de cajas creada o existente');
        }
    });
}

function createExpensesTable() {
    db.run(`CREATE TABLE IF NOT EXISTS expenses (
        expense_id INTEGER PRIMARY KEY AUTOINCREMENT,
        box_id INTEGER,
        expense_total INTEGER,
        expense_description TEXT NOT NULL,
        expense_author TEXT NOT NULL,
        FOREIGN KEY (box_id) REFERENCES boxes(box_id)
    )`, (err) => {
        if (err) {
            console.error('Error al crear la tabla de gastos:', err.message);
        } else {
            console.log('Tabla de gastos creada o existente');
        }
    });
}

function insertBox(callback) {
    const date = moment().tz('America/Argentina/Buenos_Aires').format('DD/MM/YYYY');

    const boxQuery = `INSERT INTO boxes (box_date, box_total, box_net_total) VALUES (?, 0, 0)`;

    db.run(boxQuery, [date], function(err) {
        if (err) {
            console.error('Error al abrir caja:', err.message);
            callback(err);
        } else {
            const boxId = this.lastID;
            callback(null, boxId);
        }
    });
}

function getSalesByBoxId(boxId, callback) {
    const query = `
        SELECT 
            sales.id AS sale_id, 
            sales.date AS sale_date, 
            sales.total AS sale_total,

            products.id AS product_id,
            products.name AS product_name,
            products.sellPrice AS product_price,
            sale_products.quantity AS product_quantity,

            promos.id AS promo_id,
            promos.name AS promo_name,
            promos.price AS promo_price,
            sale_promos.quantity AS promo_quantity,

            sale_amounts.amount AS extra_amount,
            sale_amounts.description AS extra_description,

            express_promos.express_promo_id AS express_promo_id,
            express_promos.total AS express_promo_total

        FROM 
            sales
        LEFT JOIN 
            sale_products ON sales.id = sale_products.sale_id
        LEFT JOIN 
            products ON sale_products.product_id = products.id

        LEFT JOIN 
            sale_promos ON sales.id = sale_promos.sale_id
        LEFT JOIN 
            promos ON sale_promos.promo_id = promos.id

        LEFT JOIN 
            sale_amounts ON sales.id = sale_amounts.sale_id

        LEFT JOIN 
            express_promos ON sales.id = express_promos.sale_id

        WHERE 
            sales.box_id = ?
        ORDER BY 
            sales.id, products.id, promos.id
    `;

    db.all(query, [boxId], (err, rows) => {
        if (err) {
            console.error('Error al obtener ventas con detalles por caja:', err.message);
            callback(err, null);
        } else {
            const sales = {};

            rows.forEach(row => {
                if (!sales[row.sale_id]) {
                    sales[row.sale_id] = {
                        id: row.sale_id,
                        date: row.sale_date,
                        total: row.sale_total,
                        products: [],
                        promos: [],
                        amounts: [],
                        expressPromos: []
                    };
                }

                if (row.product_id) {
                    sales[row.sale_id].products.push({
                        id: row.product_id,
                        name: row.product_name,
                        price: row.product_price,
                        quantity: row.product_quantity
                    });
                }

                if (row.promo_id) {
                    sales[row.sale_id].promos.push({
                        id: row.promo_id,
                        name: row.promo_name,
                        price: row.promo_price,
                        quantity: row.promo_quantity
                    });
                }

                if (row.extra_amount !== null) {
                    sales[row.sale_id].amounts.push({
                        amount: row.extra_amount,
                        description: row.extra_description
                    });
                }

                if (row.express_promo_id) {
                    sales[row.sale_id].expressPromos.push({
                        id: row.express_promo_id,
                        total: row.express_promo_total
                    });
                }
            });

            const salesArray = Object.values(sales);
            callback(null, salesArray);
        }
    });
}

function getBoxesByDate(date, callback) {
    const query = `SELECT * FROM boxes WHERE box_date = ?`;
    db.all(query, [date], (err, rows) => {
        if (err) {
            console.error('Error al obtener cajas por fecha:', err.message);
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
    searchProducts,
    createPromosTable,
    createPromoProductsTable,
    addPromo,
    getPromosWithProducts,
    searchPromos,
    deletePromo,
    createSaleAmountsTable,
    createSalePromosTable,
    getProductsByPromo,
    createExpressPromosTable,
    insertExpressPromo,
    getExpressPromosBySaleId,
    updatePromo,
    createBoxesTable,
    createExpensesTable,
    insertBox,
    getSalesByBoxId,
    getBoxesByDate
};