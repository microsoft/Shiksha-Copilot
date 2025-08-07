import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { fadeInOutAnimation, scaleAnimation } from 'src/app/shared/utility/animations.util';
import { SampleService } from './sample.service';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';

@Component({
  selector: 'app-sample',
  standalone: true,
  imports: [CommonModule,NgChartsModule],
  templateUrl: './sample.component.html',
  styleUrls: ['./sample.component.scss'],
  animations:[fadeInOutAnimation,scaleAnimation]
})
export class SampleComponent {
  public doughnutChartLabels: string[] = [ 'Download Sales', 'In-Store Sales', 'Mail-Order Sales' ];
  public doughnutChartDatasets: ChartConfiguration<'doughnut'>['data']['datasets'] = [
      { data: [ 350, 450, 100 ], label: 'Series A' },
      { data: [ 50, 150, 120 ], label: 'Series B' },
      { data: [ 250, 130, 70 ], label: 'Series C' }
    ];

  public doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: false,
    rotation: -90,
    circumference: 180
  };


  public barChartLegend = true;
  public barChartPlugins = [];

  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [ '2006', '2007', '2008', '2009', '2010', '2011', '2012' ],
    datasets: [
      { data: [ 65, 59, 80, 81, 56, 55, 40 ], label: 'Series A' },
      { data: [ 28, 48, 40, 19, 86, 27, 90 ], label: 'Series B' }
    ]
  };

  public barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: false,
  };


  public pieChartOptions: ChartOptions<'pie'> = {
    responsive: false,
  };
  public pieChartLabels = [ [ 'Download', 'Sales' ], [ 'In', 'Store', 'Sales' ], 'Mail Sales' ];
  public pieChartDatasets = [ {
    data: [ 300, 500, 100 ]
  } ];
  public pieChartLegend = true;
  public pieChartPlugins = [];
 


  public lineChartData: any[] = [
    {
        type: 'line',
        label: 'Dataset 1',
        borderWidth: 2,
        fill: false,
        data: [5, 3, 4, 10, 8, 9, 2]
      }, {
        type: 'line',
        label: 'Dataset 2',
        borderWidth: 2,
        fill: false,
        data: [8, 5, 2, 8, 7, 2, 6]
      }, {
        type: 'bar',
        label: 'Dataset 3',
        stack: 'Stack 0',
        data: [2, 4, 1, 3, 7, 3, 6],
        borderColor: 'white',
        borderWidth: 2
      }, {
        type: 'bar',
        label: 'Dataset 4',
        stack: 'Stack 0',
        data: [7, 2, 4, 5, 6, 4, 2]
      }
    ];
    public lineChartLabels = ['January', 'February', 'March', 'April', 'May', 'June', 'July'];
    public lineChartOptions: any = {
      responsive: true,
       scales: {
        y: {
          stacked:true
        }
      }  };
    public lineChartColors = [];
    public lineChartLegend = true;
    public lineChartType = 'bar';
    public lineChartPlugins = [];

  constructor(private sampleService:SampleService){}

  todoData:any;

  getData(){
    this.sampleService.getData().
    subscribe({
      next:(val)=>{
        console.log(val);
        
        this.todoData=val
      },
      error:(err)=>{
        console.log(err);
        
      }
    })
  }

}
