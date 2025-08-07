import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { SignInComponent } from "./sign-in/sign-in.component";

const routes:Routes=[
    {
        path:'',
        redirectTo:'signin',
        pathMatch:'full'
    },
    {
        path:'signin',
        component:SignInComponent
    }
]

@NgModule({
    imports:[RouterModule.forChild(routes)],
    exports:[RouterModule]
})

export class AuthRoutingModule{}