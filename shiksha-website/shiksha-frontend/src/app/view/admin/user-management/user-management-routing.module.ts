import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { AddEditUserComponent } from "./add-edit-user/add-edit-user.component";
import { UserStaffListComponent } from "src/app/shared/components/user-staff-list/user-staff-list.component";

const routes:Routes =[
    {
        path:'',
        redirectTo:'list',
        pathMatch:'full'
    },
    {
        path:'list',
        component:UserStaffListComponent
    },
    {
        path:'add',
        component:AddEditUserComponent
    },
    {
        path:':id',
        component:AddEditUserComponent
    }
]

@NgModule({
    imports:[RouterModule.forChild(routes)],
    exports:[RouterModule]
})
export class UserManagementRoutingModule{}