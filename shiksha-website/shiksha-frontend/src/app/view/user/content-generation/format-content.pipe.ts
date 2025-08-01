import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatContent',
})
export class FormatContentPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return value;

    let replacedText = value.replace(/\n/g, '<br>');

    replacedText = replacedText.replace(/"/g, '');

    replacedText = replacedText.replace(
      /\*\*(.*?)\*\*/g,
      '<strong>$1</strong>'
    );

    replacedText = replacedText.replace(
      /\*(.*?)\*/g,
      '<strong>$1</strong>'
    );

    replacedText = replacedText.replace(/#/g, '');

    // replacedText = this.handleThreeHashes(replacedText);

    // replacedText = this.handleSingleHash(replacedText);

    return replacedText;
  }

  private handleThreeHashes(value: string): string {
    return value.replace(/###(.*?)###/g, '<strong>$1</strong>');
  }

  private handleSingleHash(value: string): string {
    return value.replace(
      /#(.*?)#/g,
      (match) => `<strong>${match.substring(1, match.length - 1)}</strong>`
    );
  }
}
