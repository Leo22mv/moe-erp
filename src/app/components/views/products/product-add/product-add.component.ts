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
    if (this.form.name.length < 1 || !this.form.price || !this.form.stock || !this.form.sellPrice || !this.form.stock_limit) {
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
          this.cdr.detectChanges();
      });
    }
  }
}
