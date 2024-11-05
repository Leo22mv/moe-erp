import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
// import { ipcMain } from 'electron';

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
  checkNameError: boolean = false;
  existentNameError: boolean = false;
  existentBarcodeError: boolean = false;
  genericError: boolean = false;

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    // ipcMain.removeAllListeners('check-name-uniqueness');

    if (typeof document !== 'undefined') {
      document.getElementById('addProductForm')?.addEventListener('submit', function(event) {
        event.preventDefault();
      });
  
      window.electron.receive('check-name-uniqueness-response', (response: any) => {
        if (response.success) {
          if (response.existent) {
            this.existentNameError = true;
          } else {
            window.electron.send('insert-product', this.form);
          }
        } else {
          this.checkNameError = true;
        }
        this.cdr.detectChanges();
      });

      window.electron.receive('product-inserted', (response: any) => {
        if (response.success) {
          this.added = true;
          this.form.name = "",
          this.form.price = null,
          this.form.sellPrice = null,
          this.form.stock = null,
          this.form.barcode = null,
          this.form.brand = null,
          this.form.stock_limit = null
        } else {
          console.error(response);

          switch (response.error) {
            case "SQLITE_CONSTRAINT: UNIQUE constraint failed: products.barcode":
              this.existentBarcodeError = true;
              break;
            default:
              this.genericError = true;
              break;
          }
        }
        this.cdr.detectChanges();
      });
    }
  }

  addProduct(): void {
    this.emptyFieldsError = false;
    this.added = false;
    this.checkNameError = false;
    this.existentNameError = false;
    this.existentBarcodeError = false;
    if (this.form.name.length < 1 || !this.form.stock || !this.form.sellPrice || !this.form.stock_limit) {
      this.emptyFieldsError = true;
    } else {
      // console.log('sending');
      window.electron.send('check-name-uniqueness', this.form.name);
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
