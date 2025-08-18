import { TestBed } from '@angular/core/testing';
import { AgendaComponent } from './agenda-component';
import { CalendarView } from 'angular-calendar';
import { ViewDateFormatPipe } from '../../pipes/view-date-format.pipe';

describe('AgendaComponent date navigation', () => {
  let component: AgendaComponent;
  let pipe: ViewDateFormatPipe;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgendaComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(AgendaComponent);
    component = fixture.componentInstance;
    pipe = new ViewDateFormatPipe();
  });

  it('updates formatted date when navigating in day view', () => {
    component.view = CalendarView.Day;
    const before = pipe.transform(component.viewDate, component.view);
    component.nextWeek();
    const after = pipe.transform(component.viewDate, component.view);
    expect(after).not.toEqual(before);
    component.previousWeek();
    const back = pipe.transform(component.viewDate, component.view);
    expect(back).toEqual(before);
  });

  it('updates formatted date when navigating in week view', () => {
    component.view = CalendarView.Week;
    const before = pipe.transform(component.viewDate, component.view);
    component.nextWeek();
    const after = pipe.transform(component.viewDate, component.view);
    expect(after).not.toEqual(before);
    component.previousWeek();
    const back = pipe.transform(component.viewDate, component.view);
    expect(back).toEqual(before);
  });

  it('updates formatted date when navigating in month view', () => {
    component.view = CalendarView.Month;
    const before = pipe.transform(component.viewDate, component.view);
    component.nextWeek();
    const after = pipe.transform(component.viewDate, component.view);
    expect(after).not.toEqual(before);
    component.previousWeek();
    const back = pipe.transform(component.viewDate, component.view);
    expect(back).toEqual(before);
  });
});
