import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { AfterViewInit, Component, ElementRef, Inject, Input, OnDestroy, Optional, Self, ViewChild } from '@angular/core';
import {
  ControlValueAccessor, FormBuilder, FormControl, NgControl, ValidationErrors, Validator,
} from '@angular/forms';
import { MatFormField, MatFormFieldControl, MAT_FORM_FIELD } from '@angular/material/form-field';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-drawing-pad',
  templateUrl: './drawing-pad.component.html',
  styleUrls: ['./drawing-pad.component.scss'],
  providers: [{ provide: MatFormFieldControl, useExisting: DrawingPadComponent }],
})
export class DrawingPadComponent
  implements ControlValueAccessor, MatFormFieldControl<string>, OnDestroy, AfterViewInit, Validator {

  constructor(
    public formBuilder: FormBuilder,
    public elementRef: ElementRef<HTMLElement>,
    @Optional() @Inject(MAT_FORM_FIELD) public formField: MatFormField,
    @Optional() @Self() public ngControl: NgControl) {
    if (this.ngControl != null) {
      this.ngControl.valueAccessor = this;
    }
    this.createCanvas();
  }

  //#region Form Binding
  get empty(): boolean {
    return this._DATAURL === this._INITDATAURL;
  }

  get errorState(): boolean {
    return this._DATAURL === this._INITDATAURL;
  }

  @Input()
  get placeholder(): string {
    return this._placeholder;
  }
  set placeholder(value: string) {
    this._placeholder = value;
    this.stateChanges.next();
  }

  @Input()
  get required(): boolean {
    return this._required;
  }
  set required(value: boolean) {
    this._required = coerceBooleanProperty(value);
    this.stateChanges.next();
  }

  @Input()
  get disabled(): boolean {
    return this._disabled;
  }
  set disabled(value: boolean) {
    this._disabled = coerceBooleanProperty(value);
    if (this._disabled) {
      this.enableDashMarker = false;
      this.enableDotMarker = false;
      this.enableSolidMarker = false;
    }
    this.stateChanges.next();
  }

  @Input()
  get value(): string | null {
    return this._DATAURL;
  }
  set value(dataUrl: string | null) {
    this._DATAURL = dataUrl;
    if (dataUrl != null && (dataUrl.includes('http://') || dataUrl.includes('https://'))) {
      this.reloadImage();
    }
    this.onChange(this._DATAURL);
    this.onTouched();
    this.onValidationChange();
    this.stateChanges.next();
  }

  get shouldLabelFloat(): boolean {
    return this.focused || !this.empty;
  }

  static nextId = 0;

  // Binding
  public _DATAURL: string;
  public _INITDATAURL: string;
  public _ISDIRTY = false;
  public focused: boolean;

  public _required: boolean;
  public _placeholder: string;
  public _disabled = false;

  stateChanges = new Subject<void>();
  controlType = 'drawing-pad';
  id = `drawing-pad-${DrawingPadComponent.nextId++}`;
  autofilled?: boolean;
  @Input('aria-describedby') userAriaDescribedBy: string;

  // Loading Message
  loadingMessage = 'Pad is loading...';

  // Canvas
  @ViewChild('canvasContainer') canvasContainer: ElementRef<HTMLDivElement>;
  canvas: HTMLCanvasElement;
  canvasContext: CanvasRenderingContext2D;

  // Color Picker
  colors = [];

  // Container
  @Input() containerHeight = 'auto';
  @Input() containerWidth = 'inhiret';

  // Canvas Option
  @Input() name = '';
  @Input() height = 300;
  @Input() width = 700;
  @Input() markerColor = '#000';

  // Clear Button
  @Input() clearButtonFontColor = '#000';
  @Input() clearButtonClass = '';
  @Input() clearButtonText = 'Clear';
  @Input() saveButtonText = 'Save';
  @Input() loadButtonText = 'Load';
  @Input() captureButtonText = 'Capture';
  @Input() undoButtonText = 'Undo';
  @Input() redoButtonText = 'Redo';
  @Input() zoomOutButtonText = '-';
  @Input() zoomInButtonText = '+';
  @Input() solidMarkerButtonText = 'Solid';
  @Input() dashMarkerButtonText = 'Dash';
  @Input() dotMarkerButtonText = 'Dot';
  @Input() markerColorButtonText = 'Color';
  @Input() eraserToolButtonText = 'Eraser';

  @Input() showEraserTool = false;
  @Input() showCaptureTool = false;
  @Input() showZoom = false;
  @Input() showMarkerOptions = false;
  @Input() showLoadTool = false;
  @Input() showSaveTool = false;
  @Input() showUndoRedoTool = false;

  // Drawing Variables
  mousePos: any = { x: 0, y: 0 };
  lastPos = this.mousePos;

  // History
  history = [];
  historyCounter = 0;

  // Marker
  markerPattern = [];
  markerPatterns = [];
  @Input()
  markerWidth = 5;
  enableSolidMarker = true;
  enableDashMarker = false;
  enableDotMarker = false;
  enableEraserTool = false;

  // Zoom
  canvasOrigWidth: number;
  canvasOrigHeight: number;
  scale = 1.0;
  scaleMultiplier = 0.1;

  onChange = (_: any) => { };

  onTouched = () => { };

  onValidationChange = () => { };

  writeValue(draw: string | null): void {
    this.value = draw;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  validate({ value }: FormControl): ValidationErrors {
    this._ISDIRTY = this.errorState;
    return this._ISDIRTY && {
      invalid: true
    };
  }

  registerOnValidatorChange?(fn: () => void): void {
    this.onValidationChange = fn;
  }

  setDescribedByIds(ids: string[]): void {
    // tslint:disable-next-line: no-non-null-assertion
    const controlElement = this.elementRef.nativeElement.querySelector('.input-draw-container')!;
    controlElement.setAttribute('aria-describedby', ids.join(' '));
  }

  onContainerClick(): void {
    if (this._ISDIRTY) {
    }
  }
  //#endregion

  //#region Hooks
  ngAfterViewInit(): void {
    this.canvasContainer.nativeElement.appendChild(this.canvas);
    this.generateColors();
  }

  ngOnDestroy(): void {
    this.stateChanges.complete();
  }
  //#endregion

  //#region Canvas
  createCanvas(): void {
    this.canvas = document.createElement('canvas');

    this.canvas.style.boxShadow = 'box-shadow: 5px 10px 18px #777';
    this.canvas.style.backgroundColor = '#fff';
    this.canvas.style.margin = '0 auto';
    this.canvasContext = this.canvas.getContext('2d');
    this.canvasContext.fillStyle = 'white';

    this.canvas.addEventListener('mousedown', (event) => { this.handleMouseDown(event); }, false);
    this.canvas.addEventListener('mouseup', (event) => { this.handleMouseUp(event); }, false);
    this.canvas.addEventListener('mousemove', (event) => { this.handleMouseMove(event); }, false);

    this.canvas.addEventListener('touchstart', (event) => { this.handleTouchStart(event); }, false);
    this.canvas.addEventListener('touchend', (event) => { this.handleTouchEnd(event); }, false);
    this.canvas.addEventListener('touchmove', (event) => { this.handleTouchMove(event); }, false);

    this.canvas.addEventListener('click', (event) => { this.handleClick(event); }, false);
    this.loadingMessage = '';
  }

  reloadImage(): void {
    if (this._DATAURL === '' || this._DATAURL === undefined || this._DATAURL === null) {
      this.loadingMessage = '';
      return;
    }
    if (this._DATAURL.includes('http://') || this._DATAURL.includes('https://')) {
      this.loadingMessage = 'Loading pad background...';
    }
    const image = new Image();
    image.src = this._DATAURL;
    image.onload = () => {
      this.canvas.width = image.width;
      this.canvas.height = image.height;
      this.canvasContext.scale(this.scale, this.scale);
      this.canvasContext.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);
      this.canvasContext.restore();
      if (this._DATAURL != null && (this._DATAURL.includes('http://') || this._DATAURL.includes('https://'))) {
        this._INITDATAURL = this.toDataURL();
      }
      this.writeHistory();
      this.loadingMessage = '';
    };
    image.onerror = error => {
      this.loadingMessage = 'Error loading the background image.';
    };
  }

  renderCanvas(e): void {
    if (e.buttons !== 1) { return; }

    if (this.enableEraserTool === true) {
      this.canvasContext.beginPath();
      this.canvasContext.globalCompositeOperation = 'destination-out';
      this.canvasContext.arc(this.mousePos.x, this.mousePos.y, 8, 0, Math.PI * 2, false);
      this.canvasContext.fill();
      this.canvasContext.closePath();
    }
    else if (this.enableSolidMarker === true || this.enableDashMarker === true) {
      this.canvasContext.beginPath();
      this.canvasContext.globalCompositeOperation = 'source-over';
      this.canvasContext.setLineDash(this.markerPattern);
      this.canvasContext.moveTo(this.lastPos.x, this.lastPos.y);
      this.canvasContext.lineTo(this.mousePos.x, this.mousePos.y);
      this.canvasContext.lineJoin = 'round';
      this.canvasContext.lineCap = 'round';

      // Create gradient
      // const gradient = this.canvasContext.createLinearGradient(0, 0, this.canvas.width, 0);
      // gradient.addColorStop(0, 'magenta');
      // gradient.addColorStop(0.5, 'blue');
      // gradient.addColorStop(1.0, 'red');
      // this.canvasContext.strokeStyle = gradient;

      this.canvasContext.strokeStyle = this.markerColor;

      this.canvasContext.lineWidth = this.markerWidth * this.scale;
      this.canvasContext.stroke();
      this.canvasContext.closePath();
    }
    this.lastPos = this.mousePos;
  }

  clearCanvas(): void {
    this.canvas.width = this.canvas.width;
    this.scale = 1.0;
    this._DATAURL = this._INITDATAURL;
    this.reloadImage();
  }
  //#endregion

  //#region colorPicker
  generateColors(): void {
    const frequency = .3;
    for (let i = 0; i < 32; ++i) {
      const red = Math.sin(frequency * i + 0) * 127 + 128;
      const green = Math.sin(frequency * i + 2) * 127 + 128;
      const blue = Math.sin(frequency * i + 4) * 127 + 128;
      this.colors.push(this.RGB2Color(red, green, blue));
    }
  }

  RGB2Color(r, g, b): string {
    return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
  }

  setMarkerColor(color): void {
    this.markerColor = color;
  }
  //#endregion

  //#region Touch Event
  getTouchPos(event: TouchEvent): any {
    const rect: any = this.canvas.getBoundingClientRect();
    return {
      x: event.touches[0].clientX - rect.left,
      y: event.touches[0].clientY - rect.top,
    };
  }

  handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    const touch = event.touches[0];
    const eventName = this.enableDotMarker === true ? 'click' : 'mousedown';
    this.dispatchEvent(eventName, touch.clientX, touch.clientY);
  }

  handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    this.dispatchEvent('mouseup', null, null);
  }

  handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    const touch = event.touches[0];
    this.dispatchEvent('mousemove', touch.clientX, touch.clientY);
  }

  dispatchEvent(eventName: string, x: number = null, y: number = null): void {
    const mouseEvent = new MouseEvent(eventName, {
      clientX: x,
      clientY: y,
      buttons: x === null ? null : 1
    });
    this.canvas.dispatchEvent(mouseEvent);
  }
  //#endregion

  //#region Mouse Event
  getMousePos(event: MouseEvent): any {
    const rect: any = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  handleMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.lastPos = this.getMousePos(event);
  }

  handleMouseUp(event: MouseEvent): void {
    event.preventDefault();
    this.writeHistory();
  }

  handleMouseMove(event: MouseEvent): void {
    event.preventDefault();
    this.mousePos = this.getMousePos(event);
    this.renderCanvas(event);
  }
  //#endregion

  //#region Click Event
  handleClick(event: any): void {
    if (this.enableDotMarker !== true) { return; }
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    this.drawCoordinates(x, y);
    this.writeHistory();
  }
  drawCoordinates(x, y): void {
    this.canvasContext.beginPath();
    this.canvasContext.globalCompositeOperation = 'source-over';
    this.canvasContext.strokeStyle = this.markerColor;
    this.canvasContext.fillStyle = this.markerColor;
    this.canvasContext.arc(x, y, this.markerWidth * this.scale, 0, this.scale, true);
    this.canvasContext.fill();
    this.canvasContext.closePath();
  }
  //#endregion

  //#region  History
  writeHistory(): void {
    if (this.historyCounter < this.history.length - 1) {
      this.history.splice(this.historyCounter + 1, this.history.length - this.historyCounter);
    }
    this.history.push(this.toDataURL());
    this.historyCounter = this.history.length - 1;
    this.writeValue(this.toDataURL());
  }

  undo(): void {
    if (this.historyCounter > 0) {
      this.historyCounter--;
      this.loadHistory(this.history[this.historyCounter]);
    }
  }

  redo(): void {
    if (this.historyCounter < this.history.length - 1) {
      this.historyCounter++;
      this.loadHistory(this.history[this.historyCounter]);
    }
  }

  loadHistory(history): void {
    const image = new Image();
    image.src = history;
    image.onload = () => {
      this.canvasContext.drawImage(image, 0, 0, image.width, image.height, 0, 0, this.canvas.width, this.canvas.height);
      this.canvasContext.restore();
    };
  }
  //#endregion

  //#region Zoom
  zoomOut(): void {
    if (this.scale < .2) { return; }
    this.scale -= this.scaleMultiplier;
    this.zoomDraw();
  }

  zoomIn(): void {
    if (this.scale > 4) { return; }
    this.scale += this.scaleMultiplier;
    this.zoomDraw();
  }

  zoomDraw(): void {
    const image = new Image();
    image.src = this.history[this.historyCounter];
    image.onload = () => {
      this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.canvasContext.scale(this.scale, this.scale);
      this.canvas.width = image.width * this.scale;
      this.canvas.height = image.height * this.scale;
      this.canvasContext.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);
      this.canvasContext.restore();
    };
  }
  //#endregion

  //#region Marker
  enableSolidMarkerClick(): void {
    this.enableDashMarker = false;
    this.enableSolidMarker = true;
    this.enableDotMarker = false;
    this.enableEraserTool = false;

    this.markerPattern = [];
  }
  enableDashMarkerClick(): void {
    this.enableDashMarker = true;
    this.enableSolidMarker = false;
    this.enableDotMarker = false;
    this.enableEraserTool = false;

    this.markerPattern = [this.markerWidth * this.scale, (500 * this.markerWidth) * 2];
  }
  enableDotMarkerClick(): void {
    this.enableEraserTool = false;
    this.enableDashMarker = false;
    this.enableSolidMarker = false;
    this.enableDotMarker = true;
  }
  enableEraserToolClick(): void {
    this.enableDashMarker = false;
    this.enableSolidMarker = false;
    this.enableDotMarker = false;
    this.enableEraserTool = true;
  }
  //#endregion

  //#region Method
  saveImage(): void {
    this.loadingMessage = 'Image downloading...';
    this.canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.setAttribute('download', this.name + '.png');
      downloadLink.setAttribute('href', url);
      downloadLink.click();
      this.loadingMessage = '';
    });
  }

  loadImage(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.click();
    input.onchange = (e: any) => {
      if (e.target.files != null && e.target.files.length > 0) {
        this.loadingMessage = 'Image loading...';
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const image = new Image();
          image.src = reader.result.toString();
          image.onload = () => {
            this.canvas.width = image.width;
            this.canvas.height = image.height;
            this.canvasContext.scale(this.scale, this.scale);
            this.canvasContext.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);
            this.canvasContext.restore();
            this.writeHistory();
            this.loadingMessage = '';
          };
        };
        reader.onerror = error => {
          this.loadingMessage = 'Error uploading the image.';
        };
      }
    };
  }

  captureImage(): void {
    alert('Functionality not yet setup');
  }

  toDataURL(): string {
    return this.canvas.toDataURL();
  }
  //#endregion

}
