import { DatePipe } from '@angular/common';
import { Injectable } from '@angular/core';
import { Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { ClipboardService } from 'ngx-clipboard';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root',
})
export class UtilityService {
  /**
   * Class constructor
   * @param toastr ToastrService
   */
  constructor(
    private toastr: ToastrService,
    private datePipe: DatePipe,
    private router: Router,
    private domSanitizer:DomSanitizer,
    private clipboardService:ClipboardService
  ) {
    // constructor
  }

  public regexPattern = {
    phoneRegex: /^[6789]\d{9}$/,
    emailRegex: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,8}$/,
  };


  get loggedInUserData(){
    const userInfo : any = localStorage.getItem('userData') ?? null;
   return JSON.parse(userInfo);
  }

  /**
   * Function to handle response and show toaster
   * @param res response
   */
  handleResponse(res: any) {
    if (res.success) {
      this.showSuccess(res.message);
    }
  }

  /**
   * Function to error response and show toaster
   * @param err error
   */
  handleError(err: any) {
    if (err.status === 400) {
      this.showError(err.error.message);
    }
  }

  /**
   * Function to show success toaster
   * @param message
   */
  showSuccess(message: string) {
    this.toastr.success(message);
  }

  /**
   * Function to show error toaster
   * @param message
   */
  showError(message: string) {
    this.toastr.error(message);
  }

  /**
   * Function to show warning toaster
   * @param message
   */
  showWarning(message: string) {
    this.toastr.info(message);
  }

  /**
   * Function to check permission
   * @param premissions
   * @returns
   */
  hasPermission(premissions: string[]) {
    const data: any = localStorage.getItem('userData') ?? null;
    const loggedInUser = JSON.parse(data) ;
    if (loggedInUser) {
      return premissions.some((element) => loggedInUser.role.includes(element));
    }
    return false;
  }

  /**
   * Function to vaidate array of object of classes
   * @param array
   * @returns
   */
  validateArray(array: any) {
    for (const obj of array) {
      for (const key in obj) {
        const value = obj[key];
        if (
          value === null || value === '' ||
          (Array.isArray(value) && !this.validateArray(value))
        ) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Function to remove keys form object and create new obj
   * @param obj
   * @param keysToRemove
   * @returns
   */
  removeKeys(obj: any, keysToRemove: any[]) {
    const removedObj: any = {};
    const newObj: any = {};

    for (const key in obj) {
      if (keysToRemove.includes(key)) {
        removedObj[key] = obj[key];
      } else {
        newObj[key] = obj[key];
      }
    }
    return { newObj, removedObj };
  }

  /**
   * Function to filter data for dropdown
   * @param filterArr
   * @param filterCriteria
   * @param filterValue
   * @returns
   */
  filterDropdownValues(
    filterArr: any[],
    filterCriteria: any,
    filterValue: any
  ) {
    return filterArr.filter(
      (val: any) => val[filterCriteria] === filterValue
    )[0];
  }

  formateDate(dateTime: any) {
    if (dateTime) {
      return {
        ...dateTime,
        date: this.datePipe.transform(dateTime.date, 'yyyy-MM-dd'),
      };
    } else {
      return {};
    }
  }

  formatValue(value: string | string[]): string {
    if (typeof value === 'string') {
      return value;
    } else if (Array.isArray(value)) {
      return value.join(', ');
    } else {
      return '';
    }
  }


   /**
   * format the response to the one format which don't contain the repeated board
   * @param val 
   * @returns 
   */
   formatResponse(val:any) {
    const groupedData: any[] = [];

    val.forEach((item:any) => {
        const { board, medium, class: classValue, ...itemWithoutBoardMediumClass } = item;

        let boardEntry = groupedData.find((entry) => entry.board === board);
        if (!boardEntry) {
            boardEntry = {
                board: board,
                mediums: [],
            };
            groupedData.push(boardEntry);
        }

        let mediumEntry = boardEntry.mediums.find((entry:any) => entry.medium === medium);
        if (!mediumEntry) {
            mediumEntry = {
                medium: medium,
                classes: [],
            };
            boardEntry.mediums.push(mediumEntry);
        }

        let classEntry = mediumEntry.classes.find((entry:any) => entry.class === classValue);
        if (!classEntry) {
            classEntry = {
                class: classValue,
                data: [],
            };
            mediumEntry.classes.push(classEntry);
        }

        classEntry.data.push(itemWithoutBoardMediumClass);
    });

    return groupedData;
}

  /**
   * Function to reset array values
   * @param arr array
   * @param indexToIgnore ingnore index
   * @returns boolean array
   */
  resetArrayIfTrueInBetween(arr: boolean[], indexToIgnore: number): boolean[] {
    let encounteredTrue = false;
    for (let i = 0; i < arr.length; i++) {
      if (i !== indexToIgnore) {
        if (arr[i] === true) {
          encounteredTrue = true;
        }
        if (encounteredTrue) {
          arr[i] = false;
        }
      }
    }
    return arr;
  }

  getPageNumbers(totalItems: number, pageSize: number) {
    const totalPages = Math.ceil(totalItems / pageSize);
    const pages: number[] = [];

    // Show up to 4 pages, then ellipsis, then last two pages
    if (totalPages <= 10) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first four pages
      for (let i = 1; i <= 4; i++) {
        pages.push(i);
      }

      // Show ellipsis
      pages.push(-1);

      // Show last two pages
      for (let i = totalPages - 1; i <= totalPages; i++) {
        pages.push(i);
      }
    }

    return pages;
  }

  setResourceDetailsValue(
    facilityControl: any,
    resourceDetailsDropdown: any,
    i: any,
    val: any
  ) {
    facilityControl.get('details')?.setValue([]);
    facilityControl.get('otherType')?.reset();
    resourceDetailsDropdown[i] = [];
    if (val) {
      if (val.type === 'Others') {
        facilityControl.get('typeChipSet')?.setValue(false);
        facilityControl.get('detailsChipSet')?.setValue(false);
        facilityControl.get('otherType')?.setValidators(Validators.required);
        facilityControl.get('otherType')?.updateValueAndValidity();
      } else {
        facilityControl.get('typeChipSet')?.setValue(true);
        facilityControl.get('detailsChipSet')?.setValue(true);
        facilityControl.get('otherType')?.clearValidators();
        facilityControl.get('otherType')?.updateValueAndValidity();
        resourceDetailsDropdown[i] = [...val.facilities];
      }
      facilityControl.get('details')?.setValidators(Validators.required);
      facilityControl.get('details')?.updateValueAndValidity();
    } else {
      facilityControl.get('details')?.clearValidators();
      facilityControl.get('details')?.updateValueAndValidity();
      facilityControl.get('otherType')?.clearValidators();
      facilityControl.get('otherType')?.updateValueAndValidity();
    }
  }

  /**
   * Function to remove empty objects
   * @param arr
   * @returns
   */
  removeEmptyObjects(arr: any[]) {
    return arr.filter((obj) => {
      return !Object.values(obj).every((value) => {
        if (typeof value === 'string') {
          return value.trim() === '';
        } else {
          return value === null || value === undefined;
        }
      });
    });
  }

  /**
   * Function to remove empty type object
   * @param arr
   * @returns
   */
  removeObjectsWithEmptyType(arr: any[]) {
    return arr.filter(
      (obj) => obj.type !== null && obj.type !== undefined && obj.type !== ''
    );
  }

  /**
   * Function to check duplicates in array of objects
   * @param arr 
   * @returns 
   */
  hasDuplicates(arr:any[]) {
    const seen = new Set();
    for (const obj of arr) {
        const objString = JSON.stringify(obj);
        if (seen.has(objString)) {
            return true; 
        } else {
            seen.add(objString);
        }
    }
    return false;
}

/**
  * Function to check duplicate board and medium
  * @param array 
  * @returns 
  */
  hasDuplicateBoardMedium(array:any[]) {
    let seen = new Set();
    for (let obj of array) {
        let key = obj['board'] + '|' + obj['medium'];
        if (seen.has(key)) {
            return true;
        }
        seen.add(key);
    }
  return false;
}

/**
 * function to format chatper
 * @param data 
 * @returns 
 */
formatChapterDropdown(data:any){
  let formattedData = data;
  if(formattedData){
    formattedData.forEach((ele:any) => {
      ele.displayValue = `${ele.orderNumber}. ${ele.topics}`
    });
  }
  return formattedData    
}

formatSubjectDropdown(data:any){
  let formattedData = data;
  if(formattedData){
    formattedData.forEach((ele:any)=>{
      ele.displayName = this.getSubjectDisplayName(ele)
    })
  }
  return formattedData
}

getSubjectDisplayName(ele:any){
  return `${ele.name} Sem${ele.sem}`
}


private extractVideoId(url: string): string {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const matches = url.match(regex);
  return matches ? matches[1] : '';
}

 trustUrl(videoUrl: string): SafeResourceUrl {
  const videoId = this.extractVideoId(videoUrl);
  if(videoId){
    return this.domSanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${videoId}`);
  }else{
    return this.domSanitizer.bypassSecurityTrustResourceUrl(videoUrl);
  }
}

formatSubjecter(subjectArr:any[]){
  const formatedSubjects = subjectArr.reduce((acc, obj) => {
    let existingItem = acc.find((item:any) => item.name === obj.name);
    if (existingItem) {
      existingItem.data.push(obj.subject);
    } else {
      acc.push({
        name: obj.name,
        value:obj.subject,
        data: [obj.subject]
      });
    }
    
    return acc;
  }, []);
  return formatedSubjects
}

intToRoman(num:any) {
  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const symbols = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];

  let romanNumeral = "";

  for (let i = 0; i < values.length; i++) {
      while (num >= values[i]) {
          romanNumeral += symbols[i];
          num -= values[i];
      }
  }

  return romanNumeral;
}

shuffleOptions(arr:any[]) {
  for (let i = arr.length - 1; i > 0; i--) {
      const randomIndex = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[randomIndex]] = [arr[randomIndex], arr[i]];
  }
  return arr;
}

 copyToClipboard(rawText:any) {
    let formattedText = rawText
    .replace(/\\n/g, '\n')               
    .replace(/\\"/g, '"')                
    .replace(/\*\*(.*?)\*\*/g, '$1')    
    .replace(/###/g, '')               
    .trim();
    this.clipboardService.copy(formattedText);
    this.showSuccess("Copied to clipboard")
 }

  /**
   * Function called on logout
   */
  logout() {
    localStorage.clear();
    this.router.navigate(['/auth']);
  }  
}
