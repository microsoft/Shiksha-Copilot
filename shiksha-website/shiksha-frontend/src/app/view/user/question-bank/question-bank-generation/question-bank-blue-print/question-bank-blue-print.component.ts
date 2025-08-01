import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { DropDownConfig } from 'src/app/shared/interfaces/dropdown.interface';

@Component({
  selector: 'app-question-bank-blue-print',
  templateUrl: './question-bank-blue-print.component.html',
  styleUrls: ['./question-bank-blue-print.component.scss'],
})
export class QuestionBankBluePrintComponent implements OnInit {
  @Input() questionBankBluePrintData!: any[];

  @Input() objectiveChartMapper: any = {};

  @Input() currentStep: number = 1;

  @Input() bluePrintChapterDropdownOptions: any[] = [];

  @Input() bluePrintObjectiveDropdownOptions: any[] = [];

  @Output() backClick = new EventEmitter<boolean>();

  objectivesChartData!: ChartData<'doughnut'>;

  totalSteps: number = 3;

  bluePrintChapterDropdownConfig: DropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Topic',
    height: 'auto',
    bindLabel: 'name',
    bindValue: 'name',
    required: true,
    clearableOff: true,
  };

  bluePrintObjectiveDropdownConfig: DropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Objective',
    height: 'auto',
    bindLabel: 'objective',
    bindValue: 'objective',
    required: true,
    clearableOff: true,
  };

  objectivesChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: function (tooltipItem) {
            const value = tooltipItem.raw as number;

            let total = tooltipItem.dataset.data.reduce(
              (sum, val) => sum + val,
              0
            );
            let percentage = Math.round((value / total) * 100);

            return tooltipItem.label + ': ' + percentage + '%';
          },
        },
      },
    },
  };

  ngOnInit(): void {
    this.updateChartData();
  }

  bluePrintObjectiveChange() {
    this.updateChartData();
  }

  updateChartData() {
    const chartMapper = this.questionBankBluePrintData.reduce(
      (acc, item) => {
        item.question_distribution.forEach((innerObj: any) => {
          if (acc.hasOwnProperty(innerObj.objective)) {
            acc[innerObj.objective]++;
          }
        });
        return acc;
      },
      { ...this.objectiveChartMapper }
    );

    let labelValues: any[] = [];
    let data: any[] = [];
    for (let key in chartMapper) {
      if (chartMapper.hasOwnProperty(key)) {
        labelValues.push(key);
        data.push(chartMapper[key]);
      }
    }

    this.objectivesChartData = {
      labels: labelValues,
      datasets: [{ data }],
    };
  }

  previousStep() {
    this.backClick.emit(true);
  }
}
