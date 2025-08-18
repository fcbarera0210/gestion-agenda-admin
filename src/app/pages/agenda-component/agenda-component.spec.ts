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

  it('calculates appointment counts for day, week and month views', () => {
    const event = (date: string, status: any) => ({ start: new Date(date), meta: { eventType: 'appointment', status } } as any);
    component.events = [
      event('2025-08-18T10:00:00', 'confirmed'),
      event('2025-08-18T12:00:00', 'pending'),
      event('2025-08-19T10:00:00', 'cancelled'),
    ];
    component.viewDate = new Date('2025-08-18T00:00:00');
    component.view = CalendarView.Day;
    component.updateCounts();
    expect(component.viewCounts).toEqual({ confirmed: 1, pending: 1, cancelled: 0 });

    component.view = CalendarView.Week;
    component.updateCounts();
    expect(component.viewCounts).toEqual({ confirmed: 1, pending: 1, cancelled: 1 });

    component.view = CalendarView.Month;
    component.updateCounts();
    expect(component.viewCounts).toEqual({ confirmed: 1, pending: 1, cancelled: 1 });
  });
});
