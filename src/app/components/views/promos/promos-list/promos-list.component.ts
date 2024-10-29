import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, Subject } from 'rxjs';

@Component({
  selector: 'app-promos-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './promos-list.component.html',
  styleUrl: './promos-list.component.css'
})
export class PromosListComponent {
  loading: boolean = false;
  empty: boolean = false;
  promos: any[] = [];
  idForDelete: number | null = null;
  form: any = {
    name: null,
    price: null,
    products: []
  };
  datalist: any = [];
  products: any = [];
  searchSubject = new Subject<string>();
  filteredProducts: any = [];
  promoIndexForUpdate: number | null = null;

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.electron) {
      window.electron.send('get-promos');

      window.electron.receive('get-promos-response', (response: any) => {
        if (response.success) {
            this.promos = response.data;
            // this.loading = false;
            if (this.promos.length < 1) {
              this.empty = true;
            }
            window.electron.send('get-products');
        } else {
            console.error('Error al obtener productos:', response.error);
        }
      });

      window.electron.receive('get-products-response', (response: any) => {
        if (response.success) {
          this.products = response.data;
          this.loading = false;
          // console.log(this.productMap);
          this.cdr.detectChanges();
        } else {
          console.error('Error al obtener productos:', response.error);
        }
      });

      this.searchSubject.asObservable()
        .pipe(debounceTime(500))
        .subscribe(term => {
          this.updateDatalist(term);
        });
      
      window.electron.receive('search-products-response', (response: any) => {
        if (response.success) {
          const selectedProduct = response.data[0];
  
          const productIndex = this.form.products.findIndex((p: any) => p.name === selectedProduct.name);

          if (productIndex !== -1) {
            const updatedProduct = {
              ...this.form.products[productIndex],
              id: selectedProduct.id,
              name: selectedProduct.name
            };
            
            this.form.products[productIndex] = updatedProduct;
            this.form.products = JSON.parse(JSON.stringify(this.form.products));
            this.cdr.detectChanges();
          }
        } else {
          console.error('Error al obtener productos:', response.error);
        }
      });

      window.electron.receive('update-promo-response', (response: any) => {
        console.log(response);
        if (response.success) {
            console.log('Promo actualizada correctamente')
        } else {
            console.error('Error al actualizar promo:', response.error);
        }
      });
    }
  }

  deletePromo(): void {
    window.electron.send('delete-promo', this.idForDelete);

    window.electron.receive('delete-promo-response', (event: any, message: any) => {
        console.log(message);
    });

    let index = this.promos.findIndex(item => item.id === this.idForDelete);
    if (index !== -1) {
        this.promos.splice(index, 1);
    }

    if (this.promos.length < 1) {
      this.empty = true;
    }
  }

  updateIdForDelete(id: number) {
    this.idForDelete = id;
  }

  addProduct(): void {
    if (this.form.products.length >= 1) {
      if (this.form.products[this.form.products.length - 1].id) {
        const newProduct: any = {
          name: null,
          quantity: 1
        }
        this.form.products = [...this.form.products, { ...newProduct }];
        this.cdr.detectChanges();
      } else {
        const searchInput = document.getElementById('floatingSearchProduct') as HTMLInputElement;
        searchInput.focus();
      }
    } else {
      const newProduct: any = {
        name: null,
        quantity: 1
      }
      this.form.products = [...this.form.products, { ...newProduct }];
      this.cdr.detectChanges();
    }
  }

  onEnter(event: KeyboardEvent, product: any, index: number) {
    if (event.key === 'Enter' && product.name.length >= 1) {
      window.electron.send('search-products', product.name);
    }
  }

  updateDatalist(query: string): void {
    if (query.length >= 3) {
      // console.log('buscando')
      this.filteredProducts = this.products.filter((product: any) => product.name.toLowerCase().includes(query.toLowerCase()));
      this.datalist = [...this.filteredProducts];
      this.cdr.detectChanges();
      // console.log(this.datalist);
    }
  }

  updateFormWithPromo(promo: any) {
    this.form = {
      name: promo.name,
      price: promo.price,
      products: promo.products.map((product: any) => ({ ...product }))
    };
    this.cdr.detectChanges();
  }

  deleteProduct(productIndex: number) {
    this.form.products.splice(productIndex, 1);
    this.cdr.detectChanges();
  }

  onSearchChange(searchValue: string): void {
    this.datalist = [];
    if (searchValue.length >= 3) {
      // console.log('search');
      this.searchSubject.next(searchValue);
    }
    this.cdr.detectChanges();
  }

  trackById(index: number, item: any): number {
    return item.id || index;
  }

  savePromo() {
    const updatedPromo = {
      ...this.form,
      id: this.idForDelete
    }

    if (this.promoIndexForUpdate != null) {
      this.promos[this.promoIndexForUpdate] = {...updatedPromo};
    }

    console.log(this.idForDelete);
    window.electron.send('update-promo', updatedPromo);

    this.cdr.detectChanges();
  }

  updatePromoIndex(promoIndex: any) {
    this.promoIndexForUpdate = promoIndex;
  }
}
