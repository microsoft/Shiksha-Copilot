import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

const routes: Routes = [
  {
    path:'',
    loadChildren:()=> import('./view/view.module').then((m)=>m.ViewModule),
    canActivate:[AuthGuard]
  },
  {
    path:'auth',
    loadChildren:()=> import('./auth/auth.module').then((m)=>m.AuthModule)
  },
  {
    path:'faq',
    loadComponent:()=> import('./components/faq/faq.component').then((c)=>c.FaqComponent)
  },
  {
    path:'**',
    loadComponent:()=> import('./components/page-not-found/page-not-found.component').then((c)=>c.PageNotFoundComponent)
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes,
    {
      useHash:true
    }
  )],
  exports: [RouterModule]
})
export class AppRoutingModule { }
