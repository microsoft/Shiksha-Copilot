import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { ViewComponent } from "./view.component";
import { IsUserGuard } from "../core/guards/isUser.guard";

const routes:Routes=[

    {
        path:'',
        component:ViewComponent,
        children:[
            {
                path:'',
                redirectTo:'user',
                pathMatch:'full'
            },
            {
                path:'admin',
                loadChildren:()=> import('./admin/admin.module').then((m)=>m.AdminModule)
            },
            {
                path: 'user',
                loadChildren: () => import('./user/user.module').then((m) => m.UserModule),
                canActivate:[IsUserGuard]
            }


        ]
    }
]

@NgModule({
    imports:[RouterModule.forChild(routes)],
    exports:[RouterModule]
})

export class ViewRoutingModule{}