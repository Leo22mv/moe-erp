import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-product-add',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule
  ],
  templateUrl: './product-add.component.html',
  styleUrls: ['./product-add.component.css']
})
export class ProductAddComponent {
  form: any = {
    name: "",
    price: null,
    sellPrice: null,
    stock: null,
    barcode: null,
    brand: null,
    stock_limit: null
  };

  added: boolean = false;
  emptyFieldsError: boolean = false;
  searchingOnApi: boolean = false;
  notFoundOnApi: boolean = false;

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    if (typeof document !== 'undefined') {
      document.getElementById('addProductForm')?.addEventListener('submit', function(event) {
        event.preventDefault();
      });
    }
  }

  addProduct(): void {
    this.emptyFieldsError = false;
    this.added = false;
    if (this.form.name.length < 1 || !this.form.stock || !this.form.sellPrice || !this.form.stock_limit) {
      this.emptyFieldsError = true;
    } else {
      window.electron.send('insert-product', { 
        name: this.form.name,
        price: this.form.price,
        sellPrice: this.form.sellPrice,
        stock: this.form.stock,
        barcode: this.form.barcode,
        brand: this.form.brand,
        stock_limit: this.form.stock_limit
      });
  
      window.electron.receive('product-inserted', (response: any) => {
          console.log(response);
          this.added = true;
          this.form.name = "",
          this.form.price = null,
          this.form.sellPrice = null,
          this.form.stock = null,
          this.form.barcode = null,
          this.form.brand = null,
          this.form.stock_limit = null
          this.cdr.detectChanges();
      });
    }
  }

  searchOnApi() {
    const uri = "https://world.openfoodfacts.org/api/v3/product/" + this.form.barcode;

    this.searchingOnApi = true;
    this.notFoundOnApi = false;
    this.cdr.detectChanges();

    fetch(uri).then(res => {
      if (res.status === 200) {
        return res.json();
      } else {
        this.searchingOnApi = false;
        this.notFoundOnApi = true;
        this.cdr.detectChanges();
        return null;
      }
    }).then(res => {
      if (!this.notFoundOnApi) {
        console.log("res");
        console.log(res.product);

        this.form.name = res.product.product_name + ", ";
        this.form.brand = res.product.brands;

        for (let keyword of res.product._keywords) {
          this.form.name += keyword + " ";
        }

        this.searchingOnApi = false;
        this.cdr.detectChanges();
      }
    }, err => {
      console.log("err");
      console.error(err);
      this.searchingOnApi = false;
      this.notFoundOnApi = true;
      this.cdr.detectChanges();
    })
  }
}
