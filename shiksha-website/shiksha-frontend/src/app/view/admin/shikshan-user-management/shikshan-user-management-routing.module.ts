import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ShikshanUserManageComponent } from './shikshan-user-manage/shikshan-user-manage.component';
import { UserStaffListComponent } from 'src/app/shared/components/user-staff-list/user-staff-list.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch:'full'
  },
  {
    path: 'list',
    component:UserStaffListComponent
  },
  {
    path: 'add',
    component:ShikshanUserManageComponent
  },
  {
    path: ':id',
    component:ShikshanUserManageComponent
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ShikshanUserManagementRoutingModule { }
