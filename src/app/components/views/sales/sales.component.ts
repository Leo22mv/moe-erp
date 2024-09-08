import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnInit, QueryList, ViewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';

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

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    const localStorageSales = localStorage.getItem('sales');
    if (localStorageSales) {
      const salesArray = JSON.parse(localStorageSales);
      this.sales = salesArray;
    }
  }

  addSale() {
    this.sales.push({
      "products": [],
      "total": 0
    })
    this.updateLocalStorage();
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
    }, 50);
    this.updateLocalStorage();
  }

  onEnter(event: KeyboardEvent, item: any, sale: any) {
    if (event.key === 'Enter') {
      window.electron.send('get-product-by-barcode', item.barcode);

      window.electron.receive('get-product-by-barcode-response', (response: any) => {
        if (response.success) {
          const updatedProduct = {
            ...item,
            name: response.data.name,
            price: response.data.sellPrice,
            id: response.data.id
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
    
            sale.total = sale.products.reduce((acc: any, product: any) => {
              return acc + (product.price || 0) * (product.quantity || 1);
            }, 0);
          }

          this.cdr.detectChanges();
        } else {
          console.error('Error al obtener productos:', response.error);
        }
      });
    }
    this.updateLocalStorage();
  }

  onUpdateQuantity(item: any, sale: any, quantity: number) {
    item.quantity = item.newQuantity;
    sale.total = sale.products.reduce((acc: any, product: any) => {
      return acc + (product.price || 0) * (product.quantity || 1);
    }, 0);
    this.cdr.detectChanges();
    this.updateLocalStorage();
  }

  cancelSale(sale: any) {
    const index = this.sales.findIndex(s => s === sale);
    this.sales.splice(index, 1);
    this.updateLocalStorage();
  }

  trackByProduct(index: number): number {
    return index;
  }
  
  insertSale(sale: any) {
    if (sale.products.length > 0) {
      if (!sale.products[sale.products.length - 1].name) {
        sale.products.pop();
      }
      window.electron.send('insert-sale', sale);

      window.electron.receive('insert-sale-response', (response: any) => {
        if (response) {
            console.log(response);
        } else {
            console.error('Error al obtener productos:', response.error);
        }
      });

      this.clearSale(sale);
    }
    this.updateLocalStorage();
  }

  clearSale(sale: any) {
    sale.products = [];
    sale.total = 0;
    this.updateLocalStorage();
  }

  updateLocalStorage(): void {
    const salesString = JSON.stringify(this.sales);
    localStorage.setItem('sales', salesString);
  }
}