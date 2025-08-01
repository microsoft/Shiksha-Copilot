import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { SchoolListComponent } from "./school-list/school-list.component";
import { SchoolAddEditComponent } from "./school-add-edit/school-add-edit.component";
import { PermissionGuard } from "src/app/core/guards/permission.guard";

const routes:Routes = [
    {
        path:'',
        redirectTo:'list',
        pathMatch:'full'
    },
    {
        path:'list',
        component:SchoolListComponent,
        data: {
            permissions: ['admin','manager'],
          },
          canActivate: [PermissionGuard]
    },
    {
        path:'add',
        component:SchoolAddEditComponent,
        data: {
            permissions: ['admin'],
          },
          canActivate: [PermissionGuard]
    },
    {
        path:':id',
        component:SchoolAddEditComponent,
        data: {
            permissions: ['admin','manager'],
          },
          canActivate: [PermissionGuard]
    }
]
@NgModule({
    imports:[RouterModule.forChild(routes)],
    exports:[RouterModule]
})
export class SchoolManagementRoutingModule{}