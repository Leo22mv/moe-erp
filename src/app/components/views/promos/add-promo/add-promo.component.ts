import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
// import { ipcMain } from 'electron';

@Component({
  selector: 'app-add-promo',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule
  ],
  templateUrl: './add-promo.component.html',
  styleUrl: './add-promo.component.css'
})
export class AddPromoComponent {
  form: any = {
    name: null,
    price: null,
    products: []
  }
  added: boolean = false;
  emptyFieldsError: boolean = false;
  datalist: any[] = [];
  isLoadingDatalist: boolean = false;
  products: any = [];
  loading: boolean = true;
  filteredProducts: any = [];
  checkNameError: boolean = false;
  existentNameError: boolean = false;
  genericError: boolean = false;

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    if (typeof document !== 'undefined') {
      document.getElementById('addPromoForm')?.addEventListener('submit', function(event) {
        event.preventDefault();
      });
    }

    // ipcMain.removeAllListeners('check-name-uniqueness');

    window.electron.receive('search-products-2-response', (response: any) => {
      if (response.success) {
        // product.id = response.data[0].id;

        const selectedProduct = response.data[0];

        const productIndex = this.form.products.findIndex((p: any) => p.name === selectedProduct.name);

        // this.form.products[productIndex] = updatedProduct;

        // product.id = updatedProduct.id;

        if (productIndex !== -1) {
          const updatedProduct = {
            ...this.form.products[productIndex],
            id: selectedProduct.id,
            name: selectedProduct.name
          };
          
          this.form.products[productIndex] = updatedProduct;
          this.form.products = JSON.parse(JSON.stringify(this.form.products));
          this.cdr.detectChanges();
          // console.log(JSON.stringify(this.form.products, null, 2));
          // console.log("updated");
        }

        // this.form.products[index] = {
        //   ...product,
        //   id: selectedProduct.id,
        //   name: selectedProduct.name
        // };
        // this.form.products = [...this.form.products];
        // this.cdr.detectChanges();
      } else {
        console.error('Error al obtener productos:', response.error);
      }
    });

    window.electron.receive('search-products-response', (response: any) => {
      if (response.success) {
          this.datalist = response.data;
          this.isLoadingDatalist = false;
          this.cdr.detectChanges();
      } else {
          console.error('Error al buscar productos:', response.error);
      }
    });

    window.electron.receive('add-promo-response', (response: any) => {
      if (response.success) {
          console.log(response);
          this.added = true;
          this.form = {
            name: null,
            price: null,
            products: []
          }
      } else {
          console.error('Error al agregar promo:', response.error);
          this.genericError = true;
      }
      this.cdr.detectChanges();
    });

    window.electron.send('get-products');

    window.electron.receive('get-products-response', (response: any) => {
      if (response.success) {
        this.products = response.data;
        this.loading = false;
        this.cdr.detectChanges();
      } else {
        console.error('Error al obtener productos:', response.error);
      }
    });

    window.electron.receive('check-name-uniqueness-response', (response: any) => {
      if (response.success) {
        if (response.existent) {
          this.existentNameError = true;
        } else {
          this.addPromo({...this.form});
        }
      } else {
        this.checkNameError = true;
      }
      this.cdr.detectChanges();
    });
  }

  addProduct(): void {
    if (this.form.products.length >= 1) {
      if (this.form.products[this.form.products.length - 1].id) {
        const newProduct: any = {
          name: null,
          quantity: 1
        }
        this.form.products.push({ ...newProduct });
        this.cdr.detectChanges();
      }
    } else {
      const newProduct: any = {
        name: null,
        quantity: 1
      }
      this.form.products.push({ ...newProduct });
      this.cdr.detectChanges();
    }
  }

  onEnter(event: KeyboardEvent, product: any, index: number) {
    if (event.key === 'Enter' && product.name.length >= 1) {
      // event.stopPropagation();
      // event.preventDefault();
      window.electron.send('search-products-2', product.name);
    }

    // const callback = (response: any) => {
    //   if (response.success) {
    //     const selectedProduct = response.data[0];
        
    //     this.form.products[index] = {
    //       ...this.form.products[index],
    //       id: selectedProduct.id,
    //       name: selectedProduct.name
    //     };
        
    //     this.cdr.detectChanges();
    //     console.log(JSON.stringify(this.form.products, null, 2));
    //   } else {
    //     console.error('Error al obtener productos:', response.error);
    //   }
    //   // window.electron.off('search-products-2-response', callback);
    // };

    // window.electron.receive('search-products-2-response', callback);
  }

  updateDatalist(query: string): void {
    // console.log(JSON.stringify(this.form.products, null, 2));
    this.datalist = [];
    this.isLoadingDatalist = true;
    if (query.length >= 3) {
      // window.electron.send('search-products', query);
      this.filteredProducts = this.products.filter((product: any) => product.name.toLowerCase().includes(query.toLowerCase()));
      this.datalist = [...this.filteredProducts];
      this.cdr.detectChanges();
    }
  }

  // trackByFn(index: number, item: any) {
  //   return item.id;
  // }

  trackByFn(index: number): number {
    return index;
  }

  addPromo(form: any): void {
    console.log(form);
    if (!form.name || form.name.length < 1 || !form.price) {
      this.emptyFieldsError = true;
    } else {
      if (form.products.length >= 1 && !form.products[form.products.length-1].id) {
        form.products.pop();
      }
      window.electron.send('add-promo', form);
    }
  }

  onAddPromoButtonClick() {
    const name = {...this.form}.name;
    window.electron.send('check-name-uniqueness', name);
    this.clearErrors();
  }

  clearErrors() {
    this.emptyFieldsError = false;
    this.added = false;
    this.checkNameError = false;
    this.existentNameError = false;
    this.cdr.detectChanges();
  }
}
