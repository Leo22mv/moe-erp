import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css']
})
export class ProductListComponent {
  products: any[] = [];
  filteredProducts: any[] = [];
  loading: boolean = true;
  empty: boolean = false;
  updateForm: any = {
    id: null,
    name: null,
    price: null,
    sellPrice: null,
    stock: null,
    barcode: null,
    brand: null,
    stock_limit: null
  }
  idForDelete: number = 0;
  searchQuery: string = "";
  withoutResults: boolean = false;

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.electron) {
      window.electron.send('get-products');

      window.electron.receive('get-products-response', (response: any) => {
        if (response.success) {
            this.products = response.data;
            this.filteredProducts = this.products.sort((a, b) => a.name.localeCompare(b.name));
            this.loading = false;
            if (this.products.length < 1) {
              this.empty = true;
            }
            this.cdr.detectChanges();
        } else {
            console.error('Error al obtener productos:', response.error);
        }
      });
    }
  }

  updateIdForDelete(id: number) {
    this.idForDelete = id;
  }

  deleteProduct(): void {
    window.electron.send('delete-product', this.idForDelete);

    window.electron.receive('product-deleted', (event: any, message: any) => {
        console.log(message);
    });

    let index = this.filteredProducts.findIndex(item => item.id === this.idForDelete);
    if (index !== -1) {
        this.filteredProducts.splice(index, 1);
    }

    index = this.products.findIndex(item => item.id === this.idForDelete);
    if (index !== -1) {
        this.products.splice(index, 1);
    }

    if (this.products.length < 1) {
      this.empty = true;
    }
    if (this.filteredProducts.length < 1 && this.products.length >= 1) {
      this.withoutResults = true;
    }
  }

  updateFormWithProduct(id: number, name: string, price: number, sellPrice: number, stock: number, barcode: string, brand: string, stock_limit: number) {
    this.updateForm.id = id;
    this.updateForm.name = name;
    this.updateForm.price = price;
    this.updateForm.sellPrice = sellPrice;
    this.updateForm.stock = stock;
    this.updateForm.barcode = barcode;
    this.updateForm.brand = brand;
    this.updateForm.stock_limit = stock_limit
    this.cdr.detectChanges();
  }

  updateProduct(): void {
    window.electron.send('update-product', {
      id: this.updateForm.id,
      name: this.updateForm.name,
      price: this.updateForm.price,
      sellPrice: this.updateForm.sellPrice,
      stock: this.updateForm.stock,
      barcode: this.updateForm.barcode,
      brand: this.updateForm.brand,
      stock_limit: this.updateForm.stock_limit
    });
    
    window.electron.receive('product-updated', (event: any, message: any) => {
        console.log(event);
    });

    let index = this.filteredProducts.findIndex(item => item.id === this.idForDelete);
    if (index !== -1) {
      this.filteredProducts[index] = JSON.parse(JSON.stringify(this.updateForm));
    }

    index = this.products.findIndex(item => item.id === this.updateForm.id);
    if (index !== -1) {
        this.products[index] = JSON.parse(JSON.stringify(this.updateForm));
    }
  }

  onSearch(): void {
    this.loading = true;
    this.filteredProducts = [];
    this.withoutResults = false;
    if (this.searchQuery.length < 1) {
      this.filteredProducts = this.products.sort((a, b) => a.name.localeCompare(b.name));
      this.loading = false;
    } else {
      window.electron.send('search-products', this.searchQuery);

      window.electron.receive('search-products-response', (response: any) => {
        if (response.success) {
            this.filteredProducts = response.data;
            this.loading = false;
            if (this.filteredProducts.length < 1) {
              this.withoutResults = true;
            }
            this.cdr.detectChanges();
        } else {
            console.error('Error al buscar productos:', response.error);
        }
      });
    }
  }
}
