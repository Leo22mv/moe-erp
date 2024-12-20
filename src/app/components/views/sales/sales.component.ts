import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnInit, QueryList, ViewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, Subject } from 'rxjs';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.css']
})
export class SalesComponent implements OnInit {

  sales: any[] = [];
  barcodeListeningInput = null;
  @ViewChildren('floatingProduct') floatingProductInputs!: QueryList<ElementRef>;
  datalist: any[] = [];
  expressPromoDatalist: any[] = [];
  products: any[] = [];
  filteredProducts: any[] = [];
  loading: boolean = true;
  promos: any[] = [];
  searchSubject = new Subject<string>();
  expressPromoSearchSubject = new Subject<string>();
  productMap: Map<string, any> = new Map();
  boxOpened: boolean = false;

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    const localStorageOpenedBox = localStorage.getItem('openedBox');
    if (localStorageOpenedBox) {
      this.boxOpened = true;
    }

    const localStorageSales = localStorage.getItem('sales');
    if (localStorageSales) {
      const salesArray = JSON.parse(localStorageSales);
      this.sales = salesArray;
    }

    window.electron.receive('search-products-response', (response: any) => {
      if (response.success) {
          if (this.datalist.length < 1) {
            this.datalist = response.data;
          } else {
            this.datalist = [...this.datalist, ...response.data];
          }
          this.cdr.detectChanges();
      } else {
          console.error('Error al buscar productos:', response.error);
      }
    });

    window.electron.receive('search-promos-response', (response: any) => {
      if (response.success) {
        if (this.datalist.length < 1) {
          this.datalist = response.data;
        } else {
          this.datalist = [...this.datalist, ...response.data];
        }
        // console.log(JSON.stringify(response.data, null, 2));
        this.cdr.detectChanges();
      } else {
          console.error('Error al buscar promos:', response.error);
      }
    });

    window.electron.receive('search-products-for-express-promo-response', (response: any) => {
      if (response.success) {
          if (this.expressPromoDatalist.length < 1) {
            this.expressPromoDatalist = response.data;
          } else {
            this.expressPromoDatalist = [...this.expressPromoDatalist, ...response.data];
          }
          this.cdr.detectChanges();
      } else {
          console.error('Error al buscar productos para promo express:', response.error);
      }
    });

    window.electron.send('get-products');

    window.electron.receive('get-products-response', (response: any) => {
      if (response.success) {
        this.products = response.data;
        this.products.forEach(product => {
          this.productMap.set(product.name, product);
          // console.log(this.productMap);
        });
        this.filteredProducts = this.products;
        this.loading = false;
        // console.log(this.productMap);
        this.cdr.detectChanges();
      } else {
        console.error('Error al obtener productos:', response.error);
      }
    });

    this.searchSubject
      // .pipe(debounceTime(500))
      .subscribe(term => {
        this.updateDatalist(term);
      });

    this.expressPromoSearchSubject
      // .pipe(debounceTime(500))
      .subscribe(term => {
        this.updateExpressPromoDatalist(term);
      });

    window.electron.send('get-promos');

    window.electron.receive('get-promos-response', (response: any) => {
      if (response.success) {
        this.promos = response.data;
        this.loading = false;
        this.cdr.detectChanges();
        // console.log(this.promos);
      } else {
        console.error('Error al obtener productos:', response.error);
      }
    });

    window.electron.receive('insert-box-response', (response: any) => {
      // console.log(JSON.stringify(response, null, 2));
      if (response.success) {
          this.boxOpened = true;
          localStorage.setItem('openedBox', 'true');
          this.cdr.detectChanges();
      } else {
          console.error('Error al buscar productos:', response.error);
      }
    });
  }

  addSale() {
    this.sales.push({
      "products": [],
      "total": 0,
      "amounts": [],
      "expressPromos": [],
      "amount": null
    })
    this.updateLocalStorage();
    this.cdr.detectChanges();
  }

  addProductToSale(sale: any, saleIndex: number) {
    const newProduct = {
      id: null,
      quantity: 1,
      name: null,
      newQuantity: 1,
      barcode: "",
      brand: null,
      sellPrice: null
    };
    if (sale.products.length >= 1) {
      if (sale.products[sale.products.length - 1].name) {
        sale.products.push({ ...newProduct })
      }
    } else {
      sale.products.push({ ...newProduct })
    }

    setTimeout(() => {
      const saleInputs = this.floatingProductInputs.toArray().filter((input, index) => {
        const saleElement = input.nativeElement.closest('.col-6');
        return saleElement && saleElement.getAttribute('data-sale-index') == saleIndex;
      });
  
      if (saleInputs.length > 0) {
        saleInputs[saleInputs.length - 1].nativeElement.focus();
      }
      this.cdr.detectChanges();
    }, 50);
    this.updateLocalStorage();
  }

  onEnter(event: KeyboardEvent, item: any, sale: any, index: number) {
    if (event.key === 'Enter') {
      // if (item.barcode.startsWith("$")) {
      //   const updatedProduct = {
      //     ...item,
      //     name: "Monto",
      //     price: parseFloat(item.barcode.replace("$", "")),
      //     id: 99
      //   };

      //   const index = sale.products.indexOf(item);
      //   sale.products[index] = updatedProduct;

      //   sale.total = sale.products.reduce((acc: any, product: any) => {
      //     return acc + (product.price || 0) * (product.quantity || 1);
      //   }, 0);
      // } else {
      if (this.isNumeric(item.barcode)) {
        window.electron.send('get-product-by-barcode', item.barcode);

        window.electron.receive('get-product-by-barcode-response', (response: any) => {
          if (response.success) {
            const updatedProduct = {
              ...item,
              name: response.data.name,
              price: response.data.sellPrice,
              id: response.data.id,
              isPromo: false
            };

            let existentOnSale: boolean = false;
    
            for (let product of sale.products) {
              if (product.name == updatedProduct.name) {
                item.barcode = "";
                existentOnSale = true;
                break
              }
            }

            if (!existentOnSale)  {
              const index = sale.products.indexOf(item);
              sale.products[index] = updatedProduct;
      
              this.calculateTotal(sale);
            }

            this.addProductToSale(sale, index);
            this.cdr.detectChanges();
          } else {
            console.error('Error al obtener productos:', response.error);
          }
          this.updateLocalStorage();
        });
      } else {
        window.electron.send('search-products-2', item.barcode);

        window.electron.receive('search-products-2-response', (response: any) => {
          if (response.success && response.data[0].name == item.barcode) {
            const updatedProduct = {
              ...item,
              name: response.data[0].name,
              price: response.data[0].sellPrice,
              id: response.data[0].id,
              isPromo: false
            };

            let existentOnSale: boolean = false;
    
            for (let product of sale.products) {
              if (product.name == updatedProduct.name) {
                item.barcode = "";
                existentOnSale = true;
                break
              }
            }

            if (!existentOnSale)  {
              const index = sale.products.indexOf(item);
              sale.products[index] = updatedProduct;
      
              this.calculateTotal(sale);
            }

            this.addProductToSale(sale, index);
            this.cdr.detectChanges();
          } else {
            console.error('Error al obtener productos:', response.error);
          }
          this.updateLocalStorage();
        });

        window.electron.send('search-promos', item.barcode);

        window.electron.receive('search-promos-response', (response: any) => {
          if (response.success && response.data[0].name == item.barcode) {
            // console.log("promo: " + JSON.stringify(response.data[0]));
            const updatedProduct = {
              ...item,
              name: response.data[0].name,
              price: response.data[0].price,
              promoId: response.data[0].id,
              isPromo: true,
              productsInPromo: []
            };

            let existentOnSale: boolean = false;

            for (let product of sale.products) {
              if (product.name == updatedProduct.name) {
                item.barcode = "";
                existentOnSale = true;
                break
              }
            }

            if (!existentOnSale)  {
              window.electron.send('get-products-by-promo', updatedProduct.promoId);

              window.electron.receive('get-products-by-promo-response', (response: any) => {
                if (response.success) {
                  // console.log(JSON.stringify(response.data, null, 2));
                  
                  for (let product of response.data) {
                    updatedProduct.productsInPromo.push({
                      id: product.product_id,
                      quantity: product.quantity
                    })
                  }

                  const index = sale.products.indexOf(item);
                  sale.products[index] = updatedProduct;
          
                  this.calculateTotal(sale);

                  this.addProductToSale(sale, index);
                  this.focusLastItem(index);
                  this.cdr.detectChanges();
                  this.updateLocalStorage();
                  // console.log(JSON.stringify(sale, null, 2));
                } else {
                  console.error('Error al obtener productos de la promo:', response.error);
                }
              });
            }
          } else {
            console.error('Error al obtener promos:', response.error);
            this.addProductToSale(sale, index);
          }
        });
      }
    }
  }

  onUpdateQuantity(item: any, sale: any, quantity: number) {
    item.quantity = item.newQuantity;
    this.calculateTotal(sale);
    this.cdr.detectChanges();
    this.updateLocalStorage();
  }

  cancelSale(sale: any) {
    const index = this.sales.findIndex(s => s === sale);
    this.sales.splice(index, 1);
    this.updateLocalStorage();
    this.cdr.detectChanges();
  }

  trackByProduct(index: number): number {
    return index;
  }
  
  insertSale(sale: any) {
    if (sale.expressPromos.length >= 1 || sale.products.length >= 1) {
      for (let expressPromo of sale.expressPromos) {
        if (!expressPromo.confirmed) {
          const toastLiveExample = document.getElementById('unconfirmedExpressPromoToast');

          if (toastLiveExample) {
              const toast = new (window as any).bootstrap.Toast(toastLiveExample, {
                  delay: 5000
              });
              toast.show();
          }

          this.cdr.detectChanges();

          return;
        }
      }
      
      if (sale.products.length > 0) {
        if (!sale.products[sale.products.length - 1].name) {
          sale.products.pop();
          if (sale.products.length == 0 && sale.expressPromos.length == 0) {
            this.cdr.detectChanges();
            return;
          }
        }

        sale.products = sale.products.filter((product: any) => product.id !== 99999);
      }

      let uniqueArray: any[] = [];

      if (sale.products.length > 0) {
        sale.products.forEach((item: any) => {
          if (!item.isPromo) {
            let existent = false;
  
            uniqueArray.forEach((uniqueItem: any) => {
              if (JSON.stringify(item) == JSON.stringify(uniqueItem)) {
                existent = true;
              }
            });
            
            if (!existent) {
              uniqueArray.push(item);
            }
          } else {
            uniqueArray.push({ ...item });
            let index = uniqueArray.findIndex((uniqueItem: any) => JSON.stringify(uniqueItem) === JSON.stringify(item));
            uniqueArray[index].productsInPromo = [];
            console.log("products: " + JSON.stringify(item.productsInPromo));
            item.productsInPromo.forEach((item: any) => {
              let existent = false;

              uniqueArray[index].productsInPromo.forEach((uniqueItem: any) => {
                if (JSON.stringify(item) == JSON.stringify(uniqueItem)) {
                  existent = true;
                }
              });
              if (!existent) {
                uniqueArray[index].productsInPromo.push(item);
              }
            });
          }
        });
        sale.products = uniqueArray;
        uniqueArray = [];
      }

      if (sale.amounts.length > 0) {
        sale.amounts.forEach((item: any) => {
          let existent = false;
          uniqueArray.forEach((uniqueItem: any) => {
            if (JSON.stringify(item) == JSON.stringify(uniqueItem)) {
              existent = true;
            }
          });
          if (!existent) {
            uniqueArray.push(item);
          }
        });
        sale.amounts = uniqueArray;
        uniqueArray = [];
      }

      // if (sale.expressPromos.length > 0) {
      //   sale.expressPromos.forEach((expressPromo: any) => {
      //     uniqueArray.push(expressPromo);
      //     let index = uniqueArray.findIndex(expressPromo);
      //     uniqueArray[index].products = [];
      //     expressPromo.products.forEach((item: any) => {
      //       let existent = false;
      //       uniqueArray[index].products.forEach((uniqueItem: any) => {
      //         if (JSON.stringify(item) == JSON.stringify(uniqueItem)) {
      //           existent = true;
      //         }
      //       });
      //       if (!existent) {
      //         uniqueArray[index].products.push(item);
      //       }
      //     })
      //   });
      //   sale.expressPromos = uniqueArray;
      // }

      console.log(JSON.stringify(sale, null, 2));
      window.electron.send('insert-sale', sale);
      console.log(JSON.stringify(sale, null, 2));

      window.electron.receive('insert-sale-response', (response: any) => {
        if (response) {
            console.log(response);
            const toastLiveExample = document.getElementById('insertedSaleToast');

            if (toastLiveExample) {
              const toast = new (window as any).bootstrap.Toast(toastLiveExample, {
                delay: 5000
              });
              toast.show();
            }

            this.cdr.detectChanges();
        } else {
            console.error('Error al obtener productos:', response.error);
        }
      });

      this.clearSale(sale);
      
      this.updateLocalStorage();
    }
  }

  clearSale(sale: any) {
    sale.products = [];
    sale.total = 0;
    sale.amounts = [];
    sale.expressPromos = [];
    sale.amount = null;
    this.updateLocalStorage();
    this.cdr.detectChanges();
  }

  showCancelledSaleToast() {
    const toastLiveExample = document.getElementById('cancelledSaleToast');

    if (toastLiveExample) {
      const toast = new (window as any).bootstrap.Toast(toastLiveExample, {
        delay: 5000
      });
      toast.show();
    }

    this.cdr.detectChanges();
  }

  updateLocalStorage(): void {
    const salesString = JSON.stringify(this.sales);
    localStorage.setItem('sales', salesString);
  }

  updateDatalist(query: string): void {
    //console.log("update");
    this.datalist = [];
    this.filteredProducts = [];
    // this.isLoadingDatalist = true;
    if (query.length >= 1) {
      this.cdr.detectChanges();
      // window.electron.send('search-products', query);
      // window.electron.send('search-promos', query);

      this.filteredProducts = this.products.filter(product => {
        // console.log(product.name.toLowerCase() + " - " + product.brand?.toLowerCase() + " es igual a " + query.toLowerCase());
        //console.log(product.name.toLowerCase().includes(query.toLowerCase()));

        const isMatchName = product.name.toLowerCase().includes(query.toLowerCase());
        const isMatchBrand =  product.brand?.toLowerCase().includes(query.toLowerCase());
        // console.log(isMatch);
        // this.cdr.detectChanges();
        return isMatchName || isMatchBrand;
      });

      // const filteredProductsByBrand = this.products.filter(product => {
      //   const isMatchBrand =  product.brand?.toLowerCase().includes(query.toLowerCase());
      //   return isMatchBrand;
      // });

      // this.filteredProducts = [...filteredProductsByName, ...filteredProductsByBrand];
      // this.filteredProducts = [...filteredProductsByName];

      const filteredPromos = this.promos.filter(promo => {
        //console.log(promo.name.toLowerCase() + " es igual a " + query.toLowerCase());
        //console.log(promo.name.toLowerCase().includes(query.toLowerCase()));

        const isMatch = promo.name.toLowerCase().includes(query.toLowerCase());
        //console.log(isMatch);
        // this.cdr.detectChanges();
        return isMatch;
      });

      // this.filteredProducts = [...this.filteredProducts, ...filteredPromos];

      console.log("filteredProducts: " + JSON.stringify(this.filteredProducts, null, 2));

      // this.datalist = this.filteredProducts;

      this.datalist = [...this.filteredProducts, ...filteredPromos];

      this.cdr.detectChanges();
      console.log(JSON.stringify(this.datalist, null, 2));

      
      // const searchTerm = query.toLowerCase();

      // this.filteredProducts = Array.from(this.productMap.keys())
      //   .filter(key => key.toLowerCase().includes(searchTerm))
      //   .map(key => this.productMap.get(key));
      
      // this.datalist = this.filteredProducts;
      
      // console.log('Búsqueda: ' + JSON.stringify(this.filteredProducts, null, 2));
      
      // this.cdr.detectChanges();
    }
  }

  isNumeric(str: string): boolean {
    return /^[0-9]+$/.test(str);
  }

  deleteProduct(sale: any, index: number): void {
    for (let amount of sale.amounts) {
      if (amount.amount == sale.products[index].price && amount.description == sale.products[index].name) {
        // console.log(JSON.stringify(amount));
        sale.amounts = sale.amounts.filter((amount2: any) => amount2 != amount);
      }
    }
    sale.total -= sale.products[index].price * sale.products[index].quantity;
    sale.products.splice(index, 1);
    // console.log(sale);
    this.updateLocalStorage();
    this.cdr.detectChanges();
  }

  insertAmount(sale: any, item: any, index: number, saleIndex: number) {
    if (item.barcode.length >= 1) {
      sale.amounts.push({
        amount: sale.amount,
        description: item.barcode
      });
  
      const updatedProduct = {
        ...item,
        name: item.barcode,
        price: sale.amount,
        id: 99999
      };
  
      sale.amount = null;
  
      const indexOf = sale.products.indexOf(item);
      sale.products[indexOf] = updatedProduct;
  
      this.calculateTotal(sale);
  
      this.addProductToSale(sale, index);
      this.focusLastItem(saleIndex);
    } else {
      // document.getElementById('floatingProduct' + index)?.classList.add('is-invalid');
      
      const toastLiveExample = document.getElementById('amountDescriptionErrorToast');

      if (toastLiveExample) {
        const toast = new (window as any).bootstrap.Toast(toastLiveExample, {
          delay: 5000
        });
        toast.show();
      }

      this.cdr.detectChanges();
    }
  }

  focusLastItem(saleIndex: number) {
    setTimeout(() => {
      const saleInputs = this.floatingProductInputs.toArray().filter((input, index) => {
        const saleElement = input.nativeElement.closest('.col-6');
        return saleElement && saleElement.getAttribute('data-sale-index') == saleIndex;
      });
  
      if (saleInputs.length > 0) {
        saleInputs[saleInputs.length - 1].nativeElement.focus();
      }

      this.cdr.detectChanges();
    }, 100);
    this.updateLocalStorage();
  }

  addExpressPromoToSale(sale: any, i: number) {
    for (let expressPromo of sale.expressPromos) {
      if (!expressPromo.confirmed) {
        return;
      }
    }
    const newExpressPromo = {
      products: [],
      total: null,
      confirmed: false
    };
    sale.expressPromos.push({ ...newExpressPromo });
    this.updateLocalStorage();
    this.cdr.detectChanges();
  }

  addProductToExpressPromo(expressPromo: any) {
    for (let product of expressPromo.products) {
      if (!product.name) {
        return;
      }
    }
    const newExpressPromoProduct = {
      id: null,
      name: null,
      price: null,
      quantity: 1,
      barcode: null
    };
    expressPromo.products.push({ ...newExpressPromoProduct });
    this.updateLocalStorage();
    this.cdr.detectChanges();
  }

  updateExpressPromoDatalist(query: string): void {
    if (query.length >= 3) {
      // window.electron.send('search-products-for-express-promo', query);

      this.expressPromoDatalist = [];
      this.filteredProducts = [];
      this.cdr.detectChanges();

      this.filteredProducts = this.products.filter(product => {
        const isMatchName = product.name.toLowerCase().includes(query.toLowerCase());
        const isMatchBrand =  product.brand?.toLowerCase().includes(query.toLowerCase());
        this.cdr.detectChanges();
        return isMatchName || isMatchBrand;
      });

      const filteredPromos = this.promos.filter(promo => {
        const isMatch = promo.name.toLowerCase().includes(query.toLowerCase());
        this.cdr.detectChanges();
        return isMatch;
      });

      this.filteredProducts = [...this.filteredProducts, ...filteredPromos];

      this.expressPromoDatalist = this.filteredProducts;

      this.cdr.detectChanges();
    }
  }

  onExpressPromoProductEnter(item: any, sale: any, index: number) {
    if (this.isNumeric(item.barcode)) {
      window.electron.send('get-product-by-barcode-for-express-promo', item.barcode);

      window.electron.receive('get-product-by-barcode-for-express-promo-response', (response: any) => {
        if (response.success) {
          const updatedProduct = {
            ...item,
            name: response.data.name,
            price: response.data.sellPrice,
            id: response.data.id,
          };

          let existentOnSale: boolean = false;
  
          for (let product of sale.products) {
            if (product.name == updatedProduct.name) {
              item.barcode = "";
              existentOnSale = true;
              break
            }
          }

          if (!existentOnSale)  {
            const index = sale.products.indexOf(item);
            sale.products[index] = updatedProduct;
          }

          this.cdr.detectChanges();
        } else {
          console.error('Error al obtener productos para promo express:', response.error);
        }
        this.updateLocalStorage();
      });
    } else {
      window.electron.send('search-products-for-express-promo', item.barcode);

      window.electron.receive('search-products-for-express-promo-response', (response: any) => {
        if (response.success && response.data[0].name == item.barcode) {
          const updatedProduct = {
            ...item,
            name: response.data[0].name,
            price: response.data[0].sellPrice,
            id: response.data[0].id,
          };

          let existentOnSale: boolean = false;
  
          for (let product of sale.products) {
            if (product.name == updatedProduct.name) {
              item.barcode = "";
              existentOnSale = true;
              break
            }
          }

          if (!existentOnSale)  {
            const index = sale.products.indexOf(item);
            sale.products[index] = updatedProduct;
          }

          this.cdr.detectChanges();
        } else {
          console.error('Error al obtener productos:', response.error);
        }
        this.updateLocalStorage();
      });
    }
  }

  confirmExpressPromo(expressPromo: any, sale: any) {
    console.log(expressPromo);
    sale.total += expressPromo.total;
    expressPromo.confirmed = true;
    this.cdr.detectChanges();
  }

  calculateTotal(sale: any) {
    let total = sale.products.reduce((acc: any, product: any) => {
      return acc + (product.price || 0) * (product.quantity || 1);
    }, 0);

    let expressPromosTotal = sale.expressPromos.reduce((acc: any, promo: any) => {
      if (promo.confirmed) {
        return acc + (promo.total || 0);
      }
      return acc;
    }, 0);
  
    sale.total = total + expressPromosTotal;
  }

  deleteExpressPromo(sale: any, expressPromoIndex: number) {
    sale.expressPromos.splice(expressPromoIndex, 1);
    this.calculateTotal(sale);
    this.cdr.detectChanges();
  }

  deleteExpressPromoProduct(expressPromo: any, expressPromoProductIndex: number) {
    expressPromo.products.splice(expressPromoProductIndex, 1);
    this.cdr.detectChanges();
  }

  onSearchChange(searchValue: string): void {
    this.datalist = [];
    this.filteredProducts = [];
    if (searchValue.length >= 3) {
      this.searchSubject.next(searchValue);
    }
    this.cdr.detectChanges();
  }

  trackByProductName(index: number, item: any): number {
    return item.name;
  }
  
  onExpressPromoSearchChange(searchValue: string): void {
    this.expressPromoDatalist = [];
    this.filteredProducts = [];
    if (searchValue.length >= 3) {
      this.expressPromoSearchSubject.next(searchValue);
    }
    this.cdr.detectChanges();
  }

  onBlur() {
    // console.log("blur")
    this.datalist = [];
    this.expressPromoDatalist = [];
    this.filteredProducts = [];
    this.cdr.detectChanges();
  }

  openBox() {
    window.electron.send('insert-box');

    const toastLiveExample = document.getElementById('openedBoxToast');

    if (toastLiveExample) {
      const toast = new (window as any).bootstrap.Toast(toastLiveExample, {
        delay: 5000
      });
      toast.show();
    }

    this.cdr.detectChanges();
  }

  closeBox() {
    localStorage.removeItem('openedBox');
    localStorage.setItem('sales', '[]');

    this.sales = [];
    this.boxOpened = false;

    const toastLiveExample = document.getElementById('closedBoxToast');

    if (toastLiveExample) {
      const toast = new (window as any).bootstrap.Toast(toastLiveExample, {
        delay: 5000
      });
      toast.show();
    }

    this.cdr.detectChanges();
  }
}