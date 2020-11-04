import { AfterViewInit, Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  public environment = environment;
  
  public formGroup: FormGroup;
  public response: string;

  constructor(
    public formBuilder: FormBuilder,
    public router: Router) {
  }

  ngOnInit(): void {
    let appPath = '';
    if (this.router.url !== '/') {
      appPath = document.location.href.replace(this.router.url, '') + '/';
    }
    else {
      appPath = document.location.href;
    }
    this.formGroup = this.formBuilder.group({
      signature: new FormControl(null, Validators.required),
      withBackground: new FormControl(appPath + 'assets/img/bg.png', Validators.required),
      load: new FormControl(null, Validators.required),
      markerOption: new FormControl(null, Validators.required),
      withZoom: new FormControl(null, Validators.required),
      withUndo: new FormControl(null, Validators.required),
      showAll: new FormControl(appPath + 'assets/img/bg.png', Validators.required),
    });
  }

  ngAfterViewInit(): void {
  }

  formControlError(formControl: string): string {
    if (this.formGroup == null || this.formGroup.controls == null) { return; }

    if (this.formGroup.controls[formControl].touched) {
      return this.formGroup.controls[formControl].hasError('required')
        ? 'This is field is required.'
        : this.formGroup.controls[formControl].hasError('email')
          ? 'Must be a valid email.'
          : this.formGroup.controls[formControl].hasError('minlength')
            ? 'Minimum length is 11.'
            : this.formGroup.controls[formControl].hasError('maxlength')
              ? 'Maximum length is 11.'
              : '';
    }
  }

  formControlHasError(formControl: string): boolean {
    if (this.formGroup == null || this.formGroup.controls == null) { return; }

    if (this.formGroup.controls[formControl].touched) {
      return this.formGroup.controls[formControl].hasError('required')
        ? true
        : this.formGroup.controls[formControl].hasError('email')
          ? true
          : this.formGroup.controls[formControl].hasError('minlength')
            ? true
            : this.formGroup.controls[formControl].hasError('maxlength')
              ? true
              : false;
    }
  }

  submit(): void {
    console.log(this.formGroup);
    if (!this.formGroup.valid) {
      alert('Please Fill up required Fields.');
      return;
    }

    const model = this.formGroup.getRawValue();
    this.response = JSON.stringify(model);
  }
}
