import { Routes } from '@angular/router';
import { BoxComponent } from './components/views/box/box.component';
import { HomeComponent } from './components/views/home/home.component';
import { ProductAddComponent } from './components/views/products/product-add/product-add.component';
import { ProductListComponent } from './components/views/products/product-list/product-list.component';
import { ProductsComponent } from './components/views/products/products.component';
import { SalesComponent } from './components/views/sales/sales.component';
import { BoxSalesComponent } from './components/views/box/sales/sales.component';
import { SalesByDateComponent } from './components/views/box/sales-by-date/sales-by-date.component';
import { PromosComponent } from './components/views/promos/promos.component';
import { PromosListComponent } from './components/views/promos/promos-list/promos-list.component';
import { AddPromoComponent } from './components/views/promos/add-promo/add-promo.component';

export const routes: Routes = [
    { path: "promos", component: PromosComponent, children: [
        { path: "list", component: PromosListComponent },
        { path: "add", component: AddPromoComponent },
    ] },
    { path: "box", component: BoxComponent, children: [
        { path: "sales", component: BoxSalesComponent },
        { path: "sales-by-date", component: SalesByDateComponent },
    ] },
    { path: "sales", component: SalesComponent },
    { path: "products", component: ProductsComponent, children: [
        { path: "list", component: ProductListComponent },
        { path: "add", component: ProductAddComponent }
    ] },
    { path: "home", component: HomeComponent },
    { path: "", redirectTo: "/sales", pathMatch: "full" },
    { path: "**", redirectTo: "/sales", pathMatch: "full" }
];
