;(function (window, $, undefined) { ;(function () {
    var VERSION = '2.2.2',
        pluginName = 'datepicker',
        autoInitSelector = '.datepicker-here',
        $body, $datepickersContainer,
        containerBuilt = false,
        baseTemplate = '' +
            '<div class="datepicker">' +
            '<i class="datepicker--pointer"></i>' +
            '<nav class="datepicker--nav"></nav>' +
            '<div class="datepicker--content"></div>' +
            '</div>',
        defaults = {
            classes: '',
            inline: false,
            language: 'ru',
            startDate: new Date(),
            firstDay: '',
            weekends: [6, 0],
            dateFormat: '',
            altField: '',
            altFieldDateFormat: '@',
            toggleSelected: true,
            keyboardNav: true,

            calendars: 1,


            position: 'bottom left',
            offset: 12,

            view: 'days',
            minView: 'days',

            showOtherMonths: true,
            selectOtherMonths: true,
            moveToOtherMonthsOnSelect: true,

            showOtherYears: true,
            selectOtherYears: true,
            moveToOtherYearsOnSelect: true,

            minDate: '',
            maxDate: '',
            disableNavWhenOutOfRange: true,

            multipleDates: false, // Boolean or Number
            multipleDatesSeparator: ',',
            range: false,

            todayButton: false,
            clearButton: false,

            showEvent: 'focus',
            autoClose: false,

            // navigation
            monthsField: 'monthsShort',
            prevHtml: '<svg><path d="M 17,12 l -5,5 l 5,5"></path></svg>',
            nextHtml: '<svg><path d="M 14,12 l 5,5 l -5,5"></path></svg>',
            navTitles: {
                days: 'MM, <i>yyyy</i>',
                months: 'yyyy',
                years: 'yyyy1 - yyyy2'
            },

            // timepicker
            timepicker: false,
            onlyTimepicker: false,
            dateTimeSeparator: ' ',
            timeFormat: '',
            minHours: 0,
            maxHours: 24,
            minMinutes: 0,
            maxMinutes: 59,
            hoursStep: 1,
            minutesStep: 1,

            // events
            onSelect: '',
            onShow: '',
            onHide: '',
            onChangeMonth: '',
            onChangeYear: '',
            onChangeDecade: '',
            onChangeView: '',
            onRenderCell: ''
        },
        hotKeys = {
            'ctrlRight': [17, 39],
            'ctrlUp': [17, 38],
            'ctrlLeft': [17, 37],
            'ctrlDown': [17, 40],
            'shiftRight': [16, 39],
            'shiftUp': [16, 38],
            'shiftLeft': [16, 37],
            'shiftDown': [16, 40],
            'altUp': [18, 38],
            'altRight': [18, 39],
            'altLeft': [18, 37],
            'altDown': [18, 40],
            'ctrlShiftUp': [16, 17, 38]
        },
        datepicker;

    var Datepicker  = function (el, options) {
        this.el = el;
        this.$el = $(el);

        this.opts = $.extend(true, {}, defaults, options, this.$el.data());

        if ($body == undefined) {
            $body = $('body');
        }

        if (!this.opts.startDate) {
            this.opts.startDate = new Date();
        }

        if (this.el.nodeName == 'INPUT') {
            this.elIsInput = true;
        }

        if (this.opts.altField) {
            this.$altField = typeof this.opts.altField == 'string' ? $(this.opts.altField) : this.opts.altField;
        }

        if (this.opts.calendars > 1) {
             this.opts.showOtherMonths = false;
        }

        this.inited = false;
        this.visible = false;
        this.silent = false; // Need to prevent unnecessary rendering

        this.currentDate = this.opts.startDate;
        this.currentView = this.opts.view;
        this._createShortCuts();
        this.selectedDates = [];
        this.views = {};
        this.keys = [];
        this.minRange = '';
        this.maxRange = '';
        this._prevOnSelectValue = '';

        this.init()
    };

    datepicker = Datepicker;

    datepicker.prototype = {
        VERSION: VERSION,
        viewIndexes: ['days', 'months', 'years'],

        init: function () {
            if (!containerBuilt && !this.opts.inline && this.elIsInput) {
                this._buildDatepickersContainer();
            }
            this._buildBaseHtml();
            this._defineLocale(this.opts.language);
            this._syncWithMinMaxDates();

            if (this.elIsInput) {
                if (!this.opts.inline) {
                    // Set extra classes for proper transitions
                    this._setPositionClasses(this.opts.position);
                    this._bindEvents()
                }
                if (this.opts.keyboardNav && !this.opts.onlyTimepicker) {
                    this._bindKeyboardEvents();
                }
                this.$datepicker.on('mousedown', this._onMouseDownDatepicker.bind(this));
                this.$datepicker.on('mouseup', this._onMouseUpDatepicker.bind(this));
            }

            if (this.opts.classes) {
                this.$datepicker.addClass(this.opts.classes)
            }

            if (this.opts.timepicker) {
                this.timepicker = new $.fn.datepicker.Timepicker(this, this.opts);
                this._bindTimepickerEvents();
            }

            if (this.opts.onlyTimepicker) {
                this.$datepicker.addClass('-only-timepicker-');
            }

            if (this.opts.calendars > 1) {
                this.$datepicker.addClass('-multiple-cals-');
            }

            var i = 0;

            this.views[this.currentView] = [];

            while(i < this.opts.calendars) {
                this.views[this.currentView].push(new $.fn.datepicker.Body(this, this.currentView, this.opts, i))
                this.views[this.currentView][i].show();
                i++;
            }

            // this.views[this.currentView] = new $.fn.datepicker.Body(this, this.currentView, this.opts);
            // this.views[this.currentView].show();


            this.nav = new $.fn.datepicker.Navigation(this, this.opts);
            this.view = this.currentView;

            this.$el.on('clickCell.adp', this._onClickCell.bind(this));
            this.$datepicker.on('mouseenter', '.datepicker--cell', this._onMouseEnterCell.bind(this));
            this.$datepicker.on('mouseleave', '.datepicker--cell', this._onMouseLeaveCell.bind(this));

            this.inited = true;
        },

        _createShortCuts: function () {
            this.minDate = this.opts.minDate ? this.opts.minDate : new Date(-8639999913600000);
            this.maxDate = this.opts.maxDate ? this.opts.maxDate : new Date(8639999913600000);
        },

        _bindEvents : function () {
            this.$el.on(this.opts.showEvent + '.adp', this._onShowEvent.bind(this));
            this.$el.on('mouseup.adp', this._onMouseUpEl.bind(this));
            this.$el.on('blur.adp', this._onBlur.bind(this));
            this.$el.on('keyup.adp', this._onKeyUpGeneral.bind(this));
            $(window).on('resize.adp', this._onResize.bind(this));
            $('body').on('mouseup.adp', this._onMouseUpBody.bind(this));
        },

        _bindKeyboardEvents: function () {
            this.$el.on('keydown.adp', this._onKeyDown.bind(this));
            this.$el.on('keyup.adp', this._onKeyUp.bind(this));
            this.$el.on('hotKey.adp', this._onHotKey.bind(this));
        },

        _bindTimepickerEvents: function () {
            this.$el.on('timeChange.adp', this._onTimeChange.bind(this));
        },

        isWeekend: function (day) {
            return this.opts.weekends.indexOf(day) !== -1;
        },

        _defineLocale: function (lang) {
            if (typeof lang == 'string') {
                this.loc = $.fn.datepicker.language[lang];
                if (!this.loc) {
                    console.warn('Can\'t find language "' + lang + '" in Datepicker.language, will use "ru" instead');
                    this.loc = $.extend(true, {}, $.fn.datepicker.language.ru)
                }

                this.loc = $.extend(true, {}, $.fn.datepicker.language.ru, $.fn.datepicker.language[lang])
            } else {
                this.loc = $.extend(true, {}, $.fn.datepicker.language.ru, lang)
            }

            if (this.opts.dateFormat) {
                this.loc.dateFormat = this.opts.dateFormat
            }

            if (this.opts.timeFormat) {
                this.loc.timeFormat = this.opts.timeFormat
            }

            if (this.opts.firstDay !== '') {
                this.loc.firstDay = this.opts.firstDay
            }

            if (this.opts.timepicker) {
                this.loc.dateFormat = [this.loc.dateFormat, this.loc.timeFormat].join(this.opts.dateTimeSeparator);
            }

            if (this.opts.onlyTimepicker) {
                this.loc.dateFormat = this.loc.timeFormat;
            }

            var boundary = this._getWordBoundaryRegExp;
            if (this.loc.timeFormat.match(boundary('aa')) ||
                this.loc.timeFormat.match(boundary('AA'))
            ) {
               this.ampm = true;
            }
        },

        _buildDatepickersContainer: function () {
            containerBuilt = true;
            $body.append('<div class="datepickers-container" id="datepickers-container"></div>');
            $datepickersContainer = $('#datepickers-container');
        },

        _buildBaseHtml: function () {
            var $appendTarget,
                $inline = $('<div class="datepicker-inline">');

            if(this.el.nodeName == 'INPUT') {
                if (!this.opts.inline) {
                    $appendTarget = $datepickersContainer;
                } else {
                    $appendTarget = $inline.insertAfter(this.$el)
                }
            } else {
                $appendTarget = $inline.appendTo(this.$el)
            }

            this.$datepicker = $(baseTemplate).appendTo($appendTarget);
            this.$content = $('.datepicker--content', this.$datepicker);
            this.$nav = $('.datepicker--nav', this.$datepicker);
        },

        _triggerOnChange: function () {
            if (!this.selectedDates.length) {
                // Prevent from triggering multiple onSelect callback with same argument (empty string) in IE10-11
                if (this._prevOnSelectValue === '') return;
                this._prevOnSelectValue = '';
                return this.opts.onSelect('', '', this);
            }

            var selectedDates = this.selectedDates,
                parsedSelected = datepicker.getParsedDate(selectedDates[0]),
                formattedDates,
                _this = this,
                dates = new Date(
                    parsedSelected.year,
                    parsedSelected.month,
                    parsedSelected.date,
                    parsedSelected.hours,
                    parsedSelected.minutes
                );

                formattedDates = selectedDates.map(function (date) {
                    return _this.formatDate(_this.loc.dateFormat, date)
                }).join(this.opts.multipleDatesSeparator);

            // Create new dates array, to separate it from original selectedDates
            if (this.opts.multipleDates || this.opts.range) {
                dates = selectedDates.map(function(date) {
                    var parsedDate = datepicker.getParsedDate(date);
                    return new Date(
                        parsedDate.year,
                        parsedDate.month,
                        parsedDate.date,
                        parsedDate.hours,
                        parsedDate.minutes
                    );
                })
            }

            this._prevOnSelectValue = formattedDates;
            this.opts.onSelect(formattedDates, dates, this);
        },

        next: function () {
            var d = this.parsedDate,
                o = this.opts;
            switch (this.view) {
                case 'days':
                    this.date = new Date(d.year, d.month + 1, 1);
                    if (o.onChangeMonth) o.onChangeMonth(this.parsedDate.month, this.parsedDate.year);
                    break;
                case 'months':
                    this.date = new Date(d.year + 1, d.month, 1);
                    if (o.onChangeYear) o.onChangeYear(this.parsedDate.year);
                    break;
                case 'years':
                    this.date = new Date(d.year + 10, 0, 1);
                    if (o.onChangeDecade) o.onChangeDecade(this.curDecade);
                    break;
            }
        },

        prev: function () {
            var d = this.parsedDate,
                o = this.opts;
            switch (this.view) {
                case 'days':
                    this.date = new Date(d.year, d.month - 1, 1);
                    if (o.onChangeMonth) o.onChangeMonth(this.parsedDate.month, this.parsedDate.year);
                    break;
                case 'months':
                    this.date = new Date(d.year - 1, d.month, 1);
                    if (o.onChangeYear) o.onChangeYear(this.parsedDate.year);
                    break;
                case 'years':
                    this.date = new Date(d.year - 10, 0, 1);
                    if (o.onChangeDecade) o.onChangeDecade(this.curDecade);
                    break;
            }
        },

        formatDate: function (string, date) {
            date = date || this.date;
            var result = string,
                boundary = this._getWordBoundaryRegExp,
                locale = this.loc,
                leadingZero = datepicker.getLeadingZeroNum,
                decade = datepicker.getDecade(date),
                d = datepicker.getParsedDate(date),
                fullHours = d.fullHours,
                hours = d.hours,
                ampm = string.match(boundary('aa')) || string.match(boundary('AA')),
                dayPeriod = 'am',
                replacer = this._replacer,
                validHours;

            if (this.opts.timepicker && this.timepicker && ampm) {
                validHours = this.timepicker._getValidHoursFromDate(date, ampm);
                fullHours = leadingZero(validHours.hours);
                hours = validHours.hours;
                dayPeriod = validHours.dayPeriod;
            }

            switch (true) {
                case /@/.test(result):
                    result = result.replace(/@/, date.getTime());
                case /aa/.test(result):
                    result = replacer(result, boundary('aa'), dayPeriod);
                case /AA/.test(result):
                    result = replacer(result, boundary('AA'), dayPeriod.toUpperCase());
                case /dd/.test(result):
                    result = replacer(result, boundary('dd'), d.fullDate);
                case /d/.test(result):
                    result = replacer(result, boundary('d'), d.date);
                case /DD/.test(result):
                    result = replacer(result, boundary('DD'), locale.days[d.day]);
                case /D/.test(result):
                    result = replacer(result, boundary('D'), locale.daysShort[d.day]);
                case /mm/.test(result):
                    result = replacer(result, boundary('mm'), d.fullMonth);
                case /m/.test(result):
                    result = replacer(result, boundary('m'), d.month + 1);
                case /MM/.test(result):
                    result = replacer(result, boundary('MM'), this.loc.months[d.month]);
                case /M/.test(result):
                    result = replacer(result, boundary('M'), locale.monthsShort[d.month]);
                case /ii/.test(result):
                    result = replacer(result, boundary('ii'), d.fullMinutes);
                case /i/.test(result):
                    result = replacer(result, boundary('i'), d.minutes);
                case /hh/.test(result):
                    result = replacer(result, boundary('hh'), fullHours);
                case /h/.test(result):
                    result = replacer(result, boundary('h'), hours);
                case /yyyy/.test(result):
                    result = replacer(result, boundary('yyyy'), d.year);
                case /yyyy1/.test(result):
                    result = replacer(result, boundary('yyyy1'), decade[0]);
                case /yyyy2/.test(result):
                    result = replacer(result, boundary('yyyy2'), decade[1]);
                case /yy/.test(result):
                    result = replacer(result, boundary('yy'), d.year.toString().slice(-2));
            }

            return result;
        },

        _replacer: function (str, reg, data) {
            return str.replace(reg, function (match, p1,p2,p3) {
                return p1 + data + p3;
            })
        },

        _getWordBoundaryRegExp: function (sign) {
            var symbols = '\\s|\\.|-|/|\\\\|,|\\$|\\!|\\?|:|;';

            return new RegExp('(^|>|' + symbols + ')(' + sign + ')($|<|' + symbols + ')', 'g');
        },


        selectDate: function (date) {
            var _this = this,
                opts = _this.opts,
                d = _this.parsedDate,
                selectedDates = _this.selectedDates,
                len = selectedDates.length,
                newDate = '';

            if (Array.isArray(date)) {
                date.forEach(function (d) {
                    _this.selectDate(d)
                });
                return;
            }

            if (!(date instanceof Date)) return;

            this.lastSelectedDate = date;

            // Set new time values from Date
            if (this.timepicker) {
                this.timepicker._setTime(date);
            }

            // On this step timepicker will set valid values in it's instance
            _this._trigger('selectDate', date);

            // Set correct time values after timepicker's validation
            // Prevent from setting hours or minutes which values are lesser then `min` value or
            // greater then `max` value
            if (this.timepicker) {
                date.setHours(this.timepicker.hours);
                date.setMinutes(this.timepicker.minutes)
            }

            if (_this.view == 'days') {
                if (date.getMonth() != d.month && opts.moveToOtherMonthsOnSelect) {
                    newDate = new Date(date.getFullYear(), date.getMonth(), 1);
                }
            }

            if (_this.view == 'years') {
                if (date.getFullYear() != d.year && opts.moveToOtherYearsOnSelect) {
                    newDate = new Date(date.getFullYear(), 0, 1);
                }
            }

            if (opts.calendars === 1 && newDate) {
                _this.silent = true;
                _this.date = newDate;
                _this.silent = false;
                _this.nav._render()
            }

            if (opts.multipleDates && !opts.range) { // Set priority to range functionality
                if (len === opts.multipleDates) return;
                if (!_this._isSelected(date)) {
                    _this.selectedDates.push(date);
                }
            } else if (opts.range) {
                if (len == 2) {
                    _this.selectedDates = [date];
                    _this.minRange = date;
                    _this.maxRange = '';
                } else if (len == 1) {
                    _this.selectedDates.push(date);
                    if (!_this.maxRange){
                        _this.maxRange = date;
                    } else {
                        _this.minRange = date;
                    }
                    // Swap dates if they were selected via dp.selectDate() and second date was smaller then first
                    if (datepicker.bigger(_this.maxRange, _this.minRange)) {
                        _this.maxRange = _this.minRange;
                        _this.minRange = date;
                    }
                    _this.selectedDates = [_this.minRange, _this.maxRange]

                } else {
                    _this.selectedDates = [date];
                    _this.minRange = date;
                }
            } else {
                _this.selectedDates = [date];
            }

            _this._setInputValue();

            if (opts.onSelect) {
                _this._triggerOnChange();
            }

            if (opts.autoClose && !this.timepickerIsActive) {
                if (!opts.multipleDates && !opts.range) {
                    _this.hide();
                } else if (opts.range && _this.selectedDates.length == 2) {
                    _this.hide();
                }
            }

            this._looper(_this.views[this.currentView], '_render');
        },

        removeDate: function (date) {
            var selected = this.selectedDates,
                _this = this;

            if (!(date instanceof Date)) return;

            return selected.some(function (curDate, i) {
                if (datepicker.isSame(curDate, date)) {
                    selected.splice(i, 1);

                    if (!_this.selectedDates.length) {
                        _this.minRange = '';
                        _this.maxRange = '';
                        _this.lastSelectedDate = '';
                    } else {
                        _this.lastSelectedDate = _this.selectedDates[_this.selectedDates.length - 1];
                    }

                    _this.views[_this.currentView]._render();
                    _this._setInputValue();

                    if (_this.opts.onSelect) {
                        _this._triggerOnChange();
                    }

                    return true
                }
            })
        },

        today: function () {
            this.silent = true;
            this.view = this.opts.minView;
            this.silent = false;
            this.date = new Date();

            if (this.opts.todayButton instanceof Date) {
                this.selectDate(this.opts.todayButton)
            }
        },

        clear: function () {
            this.selectedDates = [];
            this.minRange = '';
            this.maxRange = '';
            this.views[this.currentView]._render();
            this._setInputValue();
            if (this.opts.onSelect) {
                this._triggerOnChange()
            }
        },

        /**
         * Updates datepicker options
         * @param {String|Object} param - parameter's name to update. If object then it will extend current options
         * @param {String|Number|Object} [value] - new param value
         */
        update: function (param, value) {
            var len = arguments.length,
                lastSelectedDate = this.lastSelectedDate;

            if (len == 2) {
                this.opts[param] = value;
            } else if (len == 1 && typeof param == 'object') {
                this.opts = $.extend(true, this.opts, param)
            }

            this._createShortCuts();
            this._syncWithMinMaxDates();
            this._defineLocale(this.opts.language);
            this.nav._addButtonsIfNeed();
            if (!this.opts.onlyTimepicker) this.nav._render();
            this._looper(this.views[this.currentView], '_render');

            if (this.elIsInput && !this.opts.inline) {
                this._setPositionClasses(this.opts.position);
                if (this.visible) {
                    this.setPosition(this.opts.position)
                }
            }

            if (this.opts.classes) {
                this.$datepicker.addClass(this.opts.classes)
            }

            if (this.opts.onlyTimepicker) {
                this.$datepicker.addClass('-only-timepicker-');
            }

            if (this.opts.calendars > 1) {
                this.$datepicker.addClass('-multiple-cals-');
            }

            if (this.opts.timepicker) {
                if (lastSelectedDate) this.timepicker._handleDate(lastSelectedDate);
                this.timepicker._updateRanges();
                this.timepicker._updateCurrentTime();
                // Change hours and minutes if it's values have been changed through min/max hours/minutes
                if (lastSelectedDate) {
                    lastSelectedDate.setHours(this.timepicker.hours);
                    lastSelectedDate.setMinutes(this.timepicker.minutes);
                }
            }

            this._setInputValue();

            return this;
        },

        _syncWithMinMaxDates: function () {
            var curTime = this.date.getTime();
            this.silent = true;
            if (this.minTime > curTime) {
                this.date = this.minDate;
            }

            if (this.maxTime < curTime) {
                this.date = this.maxDate;
            }
            this.silent = false;
        },

        _isSelected: function (checkDate, cellType) {
            var res = false;
            this.selectedDates.some(function (date) {
                if (datepicker.isSame(date, checkDate, cellType)) {
                    res = date;
                    return true;
                }
            });
            return res;
        },

        _setInputValue: function () {
            var _this = this,
                opts = _this.opts,
                format = _this.loc.dateFormat,
                altFormat = opts.altFieldDateFormat,
                value = _this.selectedDates.map(function (date) {
                    return _this.formatDate(format, date)
                }),
                altValues;

            if (opts.altField && _this.$altField.length) {
                altValues = this.selectedDates.map(function (date) {
                    return _this.formatDate(altFormat, date)
                });
                altValues = altValues.join(this.opts.multipleDatesSeparator);
                this.$altField.val(altValues);
            }

            value = value.join(this.opts.multipleDatesSeparator);

            this.$el.val(value)
        },

        /**
         * Check if date is between minDate and maxDate
         * @param date {object} - date object
         * @param type {string} - cell type
         * @returns {boolean}
         * @private
         */
        _isInRange: function (date, type) {
            var time = date.getTime(),
                d = datepicker.getParsedDate(date),
                min = datepicker.getParsedDate(this.minDate),
                max = datepicker.getParsedDate(this.maxDate),
                dMinTime = new Date(d.year, d.month, min.date).getTime(),
                dMaxTime = new Date(d.year, d.month, max.date).getTime(),
                types = {
                    day: time >= this.minTime && time <= this.maxTime,
                    month: dMinTime >= this.minTime && dMaxTime <= this.maxTime,
                    year: d.year >= min.year && d.year <= max.year
                };
            return type ? types[type] : types.day
        },

        _getDimensions: function ($el) {
            var offset = $el.offset();

            return {
                width: $el.outerWidth(),
                height: $el.outerHeight(),
                left: offset.left,
                top: offset.top
            }
        },

        _getDateFromCell: function (cell) {
            var curDate = this.parsedDate,
                year = cell.data('year') || curDate.year,
                month = cell.data('month') == undefined ? curDate.month : cell.data('month'),
                date = cell.data('date') || 1;

            return new Date(year, month, date);
        },

        _setPositionClasses: function (pos) {
            pos = pos.split(' ');
            var main = pos[0],
                sec = pos[1],
                classes = 'datepicker -' + main + '-' + sec + '- -from-' + main + '-';

            if (this.visible) classes += ' active';
            if (this.opts.calendars > 1) classes += ' -multiple-cals-';

            this.$datepicker
                .removeAttr('class')
                .addClass(classes);
        },

        setPosition: function (position) {
            position = position || this.opts.position;

            var dims = this._getDimensions(this.$el),
                selfDims = this._getDimensions(this.$datepicker),
                pos = position.split(' '),
                top, left,
                offset = this.opts.offset,
                main = pos[0],
                secondary = pos[1];

            switch (main) {
                case 'top':
                    top = dims.top - selfDims.height - offset;
                    break;
                case 'right':
                    left = dims.left + dims.width + offset;
                    break;
                case 'bottom':
                    top = dims.top + dims.height + offset;
                    break;
                case 'left':
                    left = dims.left - selfDims.width - offset;
                    break;
            }

            switch(secondary) {
                case 'top':
                    top = dims.top;
                    break;
                case 'right':
                    left = dims.left + dims.width - selfDims.width;
                    break;
                case 'bottom':
                    top = dims.top + dims.height - selfDims.height;
                    break;
                case 'left':
                    left = dims.left;
                    break;
                case 'center':
                    if (/left|right/.test(main)) {
                        top = dims.top + dims.height/2 - selfDims.height/2;
                    } else {
                        left = dims.left + dims.width/2 - selfDims.width/2;
                    }
            }

            this.$datepicker
                .css({
                    left: left,
                    top: top
                })
        },

        show: function () {
            var onShow = this.opts.onShow;

            this.setPosition(this.opts.position);
            this.$datepicker.addClass('active');
            this.visible = true;

            if (onShow) {
                this._bindVisionEvents(onShow)
            }
        },

        hide: function () {
            var onHide = this.opts.onHide;

            this.$datepicker
                .removeClass('active')
                .css({
                    left: '-100000px'
                });

            this.focused = '';
            this.keys = [];

            this.inFocus = false;
            this.visible = false;
            this.$el.blur();

            if (onHide) {
                this._bindVisionEvents(onHide)
            }
        },

        down: function (date) {
            this._changeView(date, 'down');
        },

        up: function (date) {
            this._changeView(date, 'up');
        },

        _bindVisionEvents: function (event) {
            this.$datepicker.off('transitionend.dp');
            event(this, false);
            this.$datepicker.one('transitionend.dp', event.bind(this, this, true))
        },

        _changeView: function (date, dir) {
            date = date || this.focused || this.date;

            var nextView = dir == 'up' ? this.viewIndex + 1 : this.viewIndex - 1;
            if (nextView > 2) nextView = 2;
            if (nextView < 0) nextView = 0;

            this.silent = true;
            this.date = new Date(date.getFullYear(), date.getMonth(), 1);
            this.silent = false;
            this.view = this.viewIndexes[nextView];

        },

        _handleHotKey: function (key) {
            var date = datepicker.getParsedDate(this._getFocusedDate()),
                focusedParsed,
                o = this.opts,
                newDate,
                totalDaysInNextMonth,
                monthChanged = false,
                yearChanged = false,
                decadeChanged = false,
                y = date.year,
                m = date.month,
                d = date.date;

            switch (key) {
                case 'ctrlRight':
                case 'ctrlUp':
                    m += 1;
                    monthChanged = true;
                    break;
                case 'ctrlLeft':
                case 'ctrlDown':
                    m -= 1;
                    monthChanged = true;
                    break;
                case 'shiftRight':
                case 'shiftUp':
                    yearChanged = true;
                    y += 1;
                    break;
                case 'shiftLeft':
                case 'shiftDown':
                    yearChanged = true;
                    y -= 1;
                    break;
                case 'altRight':
                case 'altUp':
                    decadeChanged = true;
                    y += 10;
                    break;
                case 'altLeft':
                case 'altDown':
                    decadeChanged = true;
                    y -= 10;
                    break;
                case 'ctrlShiftUp':
                    this.up();
                    break;
            }

            totalDaysInNextMonth = datepicker.getDaysCount(new Date(y,m));
            newDate = new Date(y,m,d);

            // If next month has less days than current, set date to total days in that month
            if (totalDaysInNextMonth < d) d = totalDaysInNextMonth;

            // Check if newDate is in valid range
            if (newDate.getTime() < this.minTime) {
                newDate = this.minDate;
            } else if (newDate.getTime() > this.maxTime) {
                newDate = this.maxDate;
            }

            this.focused = newDate;

            focusedParsed = datepicker.getParsedDate(newDate);
            if (monthChanged && o.onChangeMonth) {
                o.onChangeMonth(focusedParsed.month, focusedParsed.year)
            }
            if (yearChanged && o.onChangeYear) {
                o.onChangeYear(focusedParsed.year)
            }
            if (decadeChanged && o.onChangeDecade) {
                o.onChangeDecade(this.curDecade)
            }
        },

        _registerKey: function (key) {
            var exists = this.keys.some(function (curKey) {
                return curKey == key;
            });

            if (!exists) {
                this.keys.push(key)
            }
        },

        _unRegisterKey: function (key) {
            var index = this.keys.indexOf(key);

            this.keys.splice(index, 1);
        },

        _isHotKeyPressed: function () {
            var currentHotKey,
                found = false,
                _this = this,
                pressedKeys = this.keys.sort();

            for (var hotKey in hotKeys) {
                currentHotKey = hotKeys[hotKey];
                if (pressedKeys.length != currentHotKey.length) continue;

                if (currentHotKey.every(function (key, i) { return key == pressedKeys[i]})) {
                    _this._trigger('hotKey', hotKey);
                    found = true;
                }
            }

            return found;
        },

        _trigger: function (event, args) {
            this.$el.trigger(event, args)
        },

        _focusNextCell: function (keyCode, type) {
            type = type || this.cellType;

            var date = datepicker.getParsedDate(this._getFocusedDate()),
                y = date.year,
                m = date.month,
                d = date.date;

            if (this._isHotKeyPressed()){
                return;
            }

            switch(keyCode) {
                case 37: // left
                    type == 'day' ? (d -= 1) : '';
                    type == 'month' ? (m -= 1) : '';
                    type == 'year' ? (y -= 1) : '';
                    break;
                case 38: // up
                    type == 'day' ? (d -= 7) : '';
                    type == 'month' ? (m -= 3) : '';
                    type == 'year' ? (y -= 4) : '';
                    break;
                case 39: // right
                    type == 'day' ? (d += 1) : '';
                    type == 'month' ? (m += 1) : '';
                    type == 'year' ? (y += 1) : '';
                    break;
                case 40: // down
                    type == 'day' ? (d += 7) : '';
                    type == 'month' ? (m += 3) : '';
                    type == 'year' ? (y += 4) : '';
                    break;
            }

            var nd = new Date(y,m,d);
            if (nd.getTime() < this.minTime) {
                nd = this.minDate;
            } else if (nd.getTime() > this.maxTime) {
                nd = this.maxDate;
            }

            this.focused = nd;

        },

        _getFocusedDate: function () {
            var focused  = this.focused || this.selectedDates[this.selectedDates.length - 1],
                d = this.parsedDate;

            if (!focused) {
                switch (this.view) {
                    case 'days':
                        focused = new Date(d.year, d.month, new Date().getDate());
                        break;
                    case 'months':
                        focused = new Date(d.year, d.month, 1);
                        break;
                    case 'years':
                        focused = new Date(d.year, 0, 1);
                        break;
                }
            }

            return focused;
        },

        _getCell: function (date, type) {
            type = type || this.cellType;

            var d = datepicker.getParsedDate(date),
                selector = '.datepicker--cell[data-year="' + d.year + '"]',
                $cell;

            switch (type) {
                case 'month':
                    selector = '[data-month="' + d.month + '"]';
                    break;
                case 'day':
                    selector += '[data-month="' + d.month + '"][data-date="' + d.date + '"]';
                    break;
            }
            $cell = this.$el.find(selector);

            return $cell.length ? $cell : $('');
        },

        destroy: function () {
            var _this = this;
            _this.$el
                .off('.adp')
                .data('datepicker', '');

            _this.selectedDates = [];
            _this.focused = '';
            _this.views = {};
            _this.keys = [];
            _this.minRange = '';
            _this.maxRange = '';

            if (_this.opts.inline || !_this.elIsInput) {
                _this.$datepicker.closest('.datepicker-inline').remove();
            } else {
                _this.$datepicker.remove();
            }
        },

        _handleAlreadySelectedDates: function (alreadySelected, selectedDate) {
            if (this.opts.range) {
                if (!this.opts.toggleSelected) {
                    // Add possibility to select same date when range is true
                    if (this.selectedDates.length != 2) {
                        this._trigger('clickCell', selectedDate);
                    }
                } else {
                    this.removeDate(selectedDate);
                }
            } else if (this.opts.toggleSelected){
                this.removeDate(selectedDate);
            }

            // Change last selected date to be able to change time when clicking on this cell
            if (!this.opts.toggleSelected) {
                this.lastSelectedDate = alreadySelected;
                if (this.opts.timepicker) {
                    this.timepicker._setTime(alreadySelected);
                    this.timepicker.update();
                }
            }
        },

        _onShowEvent: function (e) {
            if (!this.visible) {
                this.show();
            }
        },

        _onBlur: function () {
            if (!this.inFocus && this.visible) {
                this.hide();
            }
        },

        _onMouseDownDatepicker: function (e) {
            this.inFocus = true;
        },

        _onMouseUpDatepicker: function (e) {
            this.inFocus = false;
            e.originalEvent.inFocus = true;
            if (!e.originalEvent.timepickerFocus) this.$el.focus();
        },

        _onKeyUpGeneral: function (e) {
            var val = this.$el.val();

            if (!val) {
                this.clear();
            }
        },

        _onResize: function () {
            if (this.visible) {
                this.setPosition();
            }
        },

        _onMouseUpBody: function (e) {
            if (e.originalEvent.inFocus) return;

            if (this.visible && !this.inFocus) {
                this.hide();
            }
        },

        _onMouseUpEl: function (e) {
            e.originalEvent.inFocus = true;
            setTimeout(this._onKeyUpGeneral.bind(this),4);
        },

        _onKeyDown: function (e) {
            var code = e.which;
            this._registerKey(code);

            // Arrows
            if (code >= 37 && code <= 40) {
                e.preventDefault();
                this._focusNextCell(code);
            }

            // Enter
            if (code == 13) {
                if (this.focused) {
                    if (this._getCell(this.focused).hasClass('-disabled-')) return;
                    if (this.view != this.opts.minView) {
                        this.down()
                    } else {
                        var alreadySelected = this._isSelected(this.focused, this.cellType);

                        if (!alreadySelected) {
                            if (this.timepicker) {
                                this.focused.setHours(this.timepicker.hours);
                                this.focused.setMinutes(this.timepicker.minutes);
                            }
                            this.selectDate(this.focused);
                            return;
                        }
                        this._handleAlreadySelectedDates(alreadySelected, this.focused)
                    }
                }
            }

            // Esc
            if (code == 27) {
                this.hide();
            }
        },

        _onKeyUp: function (e) {
            var code = e.which;
            this._unRegisterKey(code);
        },

        _onHotKey: function (e, hotKey) {
            this._handleHotKey(hotKey);
        },

        _onMouseEnterCell: function (e) {
            var $cell = $(e.target).closest('.datepicker--cell'),
                date = this._getDateFromCell($cell);

            // Prevent from unnecessary rendering and setting new currentDate
            this.silent = true;

            if (this.focused) {
                this.focused = ''
            }

            $cell.addClass('-focus-');

            this.focused = date;
            this.silent = false;

            if (this.opts.range && this.selectedDates.length == 1) {
                this.minRange = this.selectedDates[0];
                this.maxRange = '';
                if (datepicker.less(this.minRange, this.focused)) {
                    this.maxRange = this.minRange;
                    this.minRange = '';
                }
                this._looper(this.views[this.currentView], '_update');
            }
        },

        _onMouseLeaveCell: function (e) {
            var $cell = $(e.target).closest('.datepicker--cell');

            $cell.removeClass('-focus-');

            this.silent = true;
            this.focused = '';
            this.silent = false;
        },

        _onTimeChange: function (e, h, m) {
            var date = new Date(),
                selectedDates = this.selectedDates,
                selected = false;

            if (selectedDates.length) {
                selected = true;
                date = this.lastSelectedDate;
            }

            date.setHours(h);
            date.setMinutes(m);

            if (!selected && !this._getCell(date).hasClass('-disabled-')) {
                this.selectDate(date);
            } else {
                this._setInputValue();
                if (this.opts.onSelect) {
                    this._triggerOnChange();
                }
            }
        },

        _onClickCell: function (e, date) {
            if (this.timepicker) {
                date.setHours(this.timepicker.hours);
                date.setMinutes(this.timepicker.minutes);
            }
            this.selectDate(date);
        },

        _looper: function (arr, method) {
           arr.forEach(function (el) {
               el[method]();
           })
        },

        set focused(val) {
            if (!val && this.focused) {
                var $cell = this._getCell(this.focused);

                if ($cell.length) {
                    $cell.removeClass('-focus-')
                }
            }
            this._focused = val;
            if (this.opts.range && this.selectedDates.length == 1) {
                this.minRange = this.selectedDates[0];
                this.maxRange = '';
                if (datepicker.less(this.minRange, this._focused)) {
                    this.maxRange = this.minRange;
                    this.minRange = '';
                }
            }
            if (this.silent) return;
            this.date = val;
        },

        get focused() {
            return this._focused;
        },

        get parsedDate() {
            return datepicker.getParsedDate(this.date);
        },

        set date (val) {
            if (!(val instanceof Date)) return;

            this.currentDate = val;

            if (this.inited && !this.silent) {
                this._looper(this.views[this.view], '_render');
                this.nav._render();
                if (this.visible && this.elIsInput) {
                    this.setPosition();
                }
            }
            return val;
        },

        get date () {
            return this.currentDate
        },

        set view (val) {
            this.viewIndex = this.viewIndexes.indexOf(val);

            if (this.viewIndex < 0) {
                return;
            }

            this.prevView = this.currentView;
            this.currentView = val;

            if (this.inited) {
                if (!this.views[val]) {
                    this.views[val] = new  $.fn.datepicker.Body(this, val, this.opts)
                } else {
                    this.views[val]._render();
                }

                this.views[this.prevView].hide();
                this.views[val].show();
                this.nav._render();

                if (this.opts.onChangeView) {
                    this.opts.onChangeView(val)
                }
                if (this.elIsInput && this.visible) this.setPosition();
            }

            return val
        },

        get view() {
            return this.currentView;
        },

        get cellType() {
            return this.view.substring(0, this.view.length - 1)
        },

        get minTime() {
            var min = datepicker.getParsedDate(this.minDate);
            return new Date(min.year, min.month, min.date).getTime()
        },

        get maxTime() {
            var max = datepicker.getParsedDate(this.maxDate);
            return new Date(max.year, max.month, max.date).getTime()
        },

        get curDecade() {
            return datepicker.getDecade(this.date)
        }
    };

    //  Utils
    // -------------------------------------------------

    datepicker.getDaysCount = function (date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    datepicker.getParsedDate = function (date) {
        return {
            year: date.getFullYear(),
            month: date.getMonth(),
            fullMonth: (date.getMonth() + 1) < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1, // One based
            date: date.getDate(),
            fullDate: date.getDate() < 10 ? '0' + date.getDate() : date.getDate(),
            day: date.getDay(),
            hours: date.getHours(),
            fullHours:  date.getHours() < 10 ? '0' + date.getHours() :  date.getHours() ,
            minutes: date.getMinutes(),
            fullMinutes:  date.getMinutes() < 10 ? '0' + date.getMinutes() :  date.getMinutes()
        }
    };

    datepicker.getDecade = function (date) {
        var firstYear = Math.floor(date.getFullYear() / 10) * 10;

        return [firstYear, firstYear + 9];
    };

    datepicker.template = function (str, data) {
        return str.replace(/#\{([\w]+)\}/g, function (source, match) {
            if (data[match] || data[match] === 0) {
                return data[match]
            }
        });
    };

    datepicker.isSame = function (date1, date2, type) {
        if (!date1 || !date2) return false;
        var d1 = datepicker.getParsedDate(date1),
            d2 = datepicker.getParsedDate(date2),
            _type = type ? type : 'day',

            conditions = {
                day: d1.date == d2.date && d1.month == d2.month && d1.year == d2.year,
                month: d1.month == d2.month && d1.year == d2.year,
                year: d1.year == d2.year
            };

        return conditions[_type];
    };

    datepicker.less = function (dateCompareTo, date, type) {
        if (!dateCompareTo || !date) return false;
        return date.getTime() < dateCompareTo.getTime();
    };

    datepicker.bigger = function (dateCompareTo, date, type) {
        if (!dateCompareTo || !date) return false;
        return date.getTime() > dateCompareTo.getTime();
    };

    datepicker.getLeadingZeroNum = function (num) {
        return parseInt(num) < 10 ? '0' + num : num;
    };

    /**
     * Returns copy of date with hours and minutes equals to 0
     * @param date {Date}
     */
    datepicker.resetTime = function (date) {
        if (typeof date != 'object') return;
        date = datepicker.getParsedDate(date);
        return new Date(date.year, date.month, date.date)
    };

    $.fn.datepicker = function ( options ) {
        return this.each(function () {
            if (!$.data(this, pluginName)) {
                $.data(this,  pluginName,
                    new Datepicker( this, options ));
            } else {
                var _this = $.data(this, pluginName);

                _this.opts = $.extend(true, _this.opts, options);
                _this.update();
            }
        });
    };

    $.fn.datepicker.Constructor = Datepicker;

    $.fn.datepicker.language = {
        ru: {
            days: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
            daysShort: ['Вос','Пон','Вто','Сре','Чет','Пят','Суб'],
            daysMin: ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'],
            months: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
            monthsShort: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
            today: 'Сегодня',
            clear: 'Очистить',
            dateFormat: 'dd.mm.yyyy',
            timeFormat: 'hh:ii',
            firstDay: 1
        }
    };

    $(function () {
        $(autoInitSelector).datepicker();
    })

})();

;(function () {
    var templates = {
        days:'' +
        '<div class="datepicker--days datepicker--body">' +
        '<div class="datepicker--days-names"></div>' +
        '<div class="datepicker--cells datepicker--cells-days"></div>' +
        '</div>',
        months: '' +
        '<div class="datepicker--months datepicker--body">' +
        '<div class="datepicker--cells datepicker--cells-months"></div>' +
        '</div>',
        years: '' +
        '<div class="datepicker--years datepicker--body">' +
        '<div class="datepicker--cells datepicker--cells-years"></div>' +
        '</div>'
        },
        datepicker = $.fn.datepicker,
        dp = datepicker.Constructor;

    datepicker.Body = function (d, type, opts, index) {
        this.d = d;
        this.type = type;
        this.opts = opts;
        this.$el = $('');
        this.index = index;

        if (this.opts.onlyTimepicker) return;
        this.init();
    };

    datepicker.Body.prototype = {
        init: function () {
            this._buildBaseHtml();
            this._render();

            this._bindEvents();
        },

        _bindEvents: function () {
            this.$el.on('click', '.datepicker--cell', $.proxy(this._onClickCell, this));
        },

        _buildBaseHtml: function () {
            this.$el = $(templates[this.type]).appendTo(this.d.$content);
            this.$names = $('.datepicker--days-names', this.$el);
            this.$cells = $('.datepicker--cells', this.$el);
        },

        _getDayNamesHtml: function (firstDay, curDay, html, i) {
            curDay = curDay != undefined ? curDay : firstDay;
            html = html ? html : '';
            i = i != undefined ? i : 0;

            if (i > 7) return html;
            if (curDay == 7) return this._getDayNamesHtml(firstDay, 0, html, ++i);

            html += '<div class="datepicker--day-name' + (this.d.isWeekend(curDay) ? " -weekend-" : "") + '">' + this.d.loc.daysMin[curDay] + '</div>';

            return this._getDayNamesHtml(firstDay, ++curDay, html, ++i);
        },

        _getCellContents: function (date, type) {
            var classes = "datepicker--cell datepicker--cell-" + type,
                currentDate = new Date(),
                parent = this.d,
                minRange = dp.resetTime(parent.minRange),
                maxRange = dp.resetTime(parent.maxRange),
                opts = parent.opts,
                d = dp.getParsedDate(date),
                render = {},
                html = d.date;

            switch (type) {
                case 'day':
                    if (parent.isWeekend(d.day)) classes += " -weekend-";
                    if (d.month != this.localViewDate.month) {
                        classes += " -other-month-";
                        if (!opts.selectOtherMonths) {
                            classes += " -disabled-";
                        }
                        if (!opts.showOtherMonths) html = '';
                    }
                    break;
                case 'month':
                    html = parent.loc[parent.opts.monthsField][d.month];
                    break;
                case 'year':
                    var decade = parent.curDecade;
                    html = d.year;
                    if (d.year < decade[0] || d.year > decade[1]) {
                        classes += ' -other-decade-';
                        if (!opts.selectOtherYears) {
                            classes += " -disabled-";
                        }
                        if (!opts.showOtherYears) html = '';
                    }
                    break;
            }

            if (opts.onRenderCell) {
                render = opts.onRenderCell(date, type) || {};
                html = render.html ? render.html : html;
                classes += render.classes ? ' ' + render.classes : '';
            }

            if (opts.range) {
                if (dp.isSame(minRange, date, type)) classes += ' -range-from-';
                if (dp.isSame(maxRange, date, type)) classes += ' -range-to-';

                if (parent.selectedDates.length == 1 && parent.focused) {
                    if (
                        (dp.bigger(minRange, date) && dp.less(parent.focused, date)) ||
                        (dp.less(maxRange, date) && dp.bigger(parent.focused, date)))
                    {
                        classes += ' -in-range-'
                    }

                    if (dp.less(maxRange, date) && dp.isSame(parent.focused, date)) {
                        classes += ' -range-from-'
                    }
                    if (dp.bigger(minRange, date) && dp.isSame(parent.focused, date)) {
                        classes += ' -range-to-'
                    }

                } else if (parent.selectedDates.length == 2) {
                    if (dp.bigger(minRange, date) && dp.less(maxRange, date)) {
                        classes += ' -in-range-'
                    }
                }
            }


            if (dp.isSame(currentDate, date, type)) classes += ' -current-';
            if (parent.focused && dp.isSame(date, parent.focused, type)) classes += ' -focus-';
            if (parent._isSelected(date, type)) classes += ' -selected-';
            if (!parent._isInRange(date, type) || render.disabled) classes += ' -disabled-';

            return {
                html: html,
                classes: classes
            }
        },

        /**
         * Calculates days number to render. Generates days html and returns it.
         * @param {object} date - Date object
         * @returns {string}
         * @private
         */
        _getDaysHtml: function (date) {
            var totalMonthDays = dp.getDaysCount(date),
                firstMonthDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay(),
                lastMonthDay = new Date(date.getFullYear(), date.getMonth(), totalMonthDays).getDay(),
                daysFromPevMonth = firstMonthDay - this.d.loc.firstDay,
                daysFromNextMonth = 6 - lastMonthDay + this.d.loc.firstDay;

            daysFromPevMonth = daysFromPevMonth < 0 ? daysFromPevMonth + 7 : daysFromPevMonth;
            daysFromNextMonth = daysFromNextMonth > 6 ? daysFromNextMonth - 7 : daysFromNextMonth;

            var startDayIndex = -daysFromPevMonth + 1,
                m, y,
                html = '';

            for (var i = startDayIndex, max = totalMonthDays + daysFromNextMonth; i <= max; i++) {
                y = date.getFullYear();
                m = date.getMonth();

                html += this._getDayHtml(new Date(y, m, i))
            }

            return html;
        },

        _getDayHtml: function (date) {
           var content = this._getCellContents(date, 'day');

            return '<div class="' + content.classes + '" ' +
                'data-date="' + date.getDate() + '" ' +
                'data-month="' + date.getMonth() + '" ' +
                'data-year="' + date.getFullYear() + '">' + content.html + '</div>';
        },

        /**
         * Generates months html
         * @param {object} date - date instance
         * @returns {string}
         * @private
         */
        _getMonthsHtml: function (date) {
            var html = '',
                d = dp.getParsedDate(date),
                i = 0;

            while(i < 12) {
                html += this._getMonthHtml(new Date(d.year, i));
                i++
            }

            return html;
        },

        _getMonthHtml: function (date) {
            var content = this._getCellContents(date, 'month');

            return '<div class="' + content.classes + '" data-month="' + date.getMonth() + '">' + content.html + '</div>'
        },

        _getYearsHtml: function (date) {
            var d = dp.getParsedDate(date),
                decade = dp.getDecade(date),
                firstYear = decade[0] - 1,
                html = '',
                i = firstYear;

            for (i; i <= decade[1] + 1; i++) {
                html += this._getYearHtml(new Date(i , 0));
            }

            return html;
        },

        _getYearHtml: function (date) {
            var content = this._getCellContents(date, 'year');

            return '<div class="' + content.classes + '" data-year="' + date.getFullYear() + '">' + content.html + '</div>'
        },

        _renderTypes: {
            days: function () {
                var parsed = dp.getParsedDate(this.d.currentDate),
                    dayNames = this._getDayNamesHtml(this.d.loc.firstDay),
                    days = this._getDaysHtml(new Date(parsed.year, parsed.month + this.index, 1));

                this.$cells.html(days);
                this.$names.html(dayNames)
            },
            months: function () {
                var html = this._getMonthsHtml(this.d.currentDate);

                this.$cells.html(html)
            },
            years: function () {
                var html = this._getYearsHtml(this.d.currentDate);

                this.$cells.html(html)
            }
        },

        _render: function () {
            if (this.opts.onlyTimepicker) return;
            this._renderTypes[this.type].bind(this)();
        },

        _update: function () {
            var $cells = $('.datepicker--cell', this.$cells),
                _this = this,
                classes,
                $cell,
                date;
            $cells.each(function (cell, i) {
                $cell = $(this);
                date = _this.d._getDateFromCell($(this));
                classes = _this._getCellContents(date, _this.d.cellType);
                $cell.attr('class',classes.classes)
            });
        },

        show: function () {
            if (this.opts.onlyTimepicker) return;
            this.$el.addClass('active');
            this.acitve = true;
        },

        hide: function () {
            this.$el.removeClass('active');
            this.active = false;
        },

        get localViewDate(){
            var viewDate = this.d.parsedDate,
                index = this.index;

            return dp.getParsedDate(new Date(viewDate.year, viewDate.month + index, viewDate.date))
        },

        //  Events
        // -------------------------------------------------

        _handleClick: function (el) {
            var date = el.data('date') || 1,
                month = el.data('month') || 0,
                year = el.data('year') || this.d.parsedDate.year,
                dp = this.d;
            // Change view if min view does not reach yet
            if (dp.view != this.opts.minView) {
                dp.down(new Date(year, month, date));
                return;
            }
            // Select date if min view is reached
            var selectedDate = new Date(year, month, date),
                alreadySelected = this.d._isSelected(selectedDate, this.d.cellType);

            if (!alreadySelected) {
                dp._trigger('clickCell', selectedDate);
                return;
            }

            dp._handleAlreadySelectedDates.bind(dp, alreadySelected, selectedDate)();

        },

        _onClickCell: function (e) {
            var $el = $(e.target).closest('.datepicker--cell');

            if ($el.hasClass('-disabled-')) return;

            this._handleClick.bind(this)($el);
        }
    };
})();

;(function () {
    var template = '' +
        '<div class="datepicker--nav-action" data-action="prev">#{prevHtml}</div>' +
        '<div class="datepicker--nav-title">#{title}</div>' +
        '<div class="datepicker--nav-action" data-action="next">#{nextHtml}</div>',
        buttonsContainerTemplate = '<div class="datepicker--buttons"></div>',
        button = '<span class="datepicker--button" data-action="#{action}">#{label}</span>',
        datepicker = $.fn.datepicker,
        dp = datepicker.Constructor;

    datepicker.Navigation = function (d, opts) {
        this.d = d;
        this.opts = opts;

        this.$buttonsContainer = '';

        this.init();
    };

    datepicker.Navigation.prototype = {
        init: function () {
            this._buildBaseHtml();
            this._bindEvents();
        },

        _bindEvents: function () {
            this.d.$nav.on('click', '.datepicker--nav-action', $.proxy(this._onClickNavButton, this));
            this.d.$nav.on('click', '.datepicker--nav-title', $.proxy(this._onClickNavTitle, this));
            this.d.$datepicker.on('click', '.datepicker--button', $.proxy(this._onClickNavButton, this));
        },

        _buildBaseHtml: function () {
            if (!this.opts.onlyTimepicker) {
                this._render();
            }
            this._addButtonsIfNeed();
        },

        _addButtonsIfNeed: function () {
            if (this.opts.todayButton) {
                this._addButton('today')
            }
            if (this.opts.clearButton) {
                this._addButton('clear')
            }
        },

        _render: function () {
            var title = this._getTitle(this.d.currentDate),
                html = dp.template(template, $.extend({title: title}, this.opts));
            this.d.$nav.html(html);
            if (this.d.view == 'years') {
                $('.datepicker--nav-title', this.d.$nav).addClass('-disabled-');
            }
            this.setNavStatus();
        },

        _getTitle: function (date) {
            return this.d.formatDate(this.opts.navTitles[this.d.view], date)
        },

        _addButton: function (type) {
            if (!this.$buttonsContainer.length) {
                this._addButtonsContainer();
            }

            var data = {
                    action: type,
                    label: this.d.loc[type]
                },
                html = dp.template(button, data);

            if ($('[data-action=' + type + ']', this.$buttonsContainer).length) return;
            this.$buttonsContainer.append(html);
        },

        _addButtonsContainer: function () {
            this.d.$datepicker.append(buttonsContainerTemplate);
            this.$buttonsContainer = $('.datepicker--buttons', this.d.$datepicker);
        },

        setNavStatus: function () {
            if (!(this.opts.minDate || this.opts.maxDate) || !this.opts.disableNavWhenOutOfRange) return;

            var date = this.d.parsedDate,
                m = date.month,
                y = date.year,
                d = date.date;

            switch (this.d.view) {
                case 'days':
                    if (!this.d._isInRange(new Date(y, m-1, 1), 'month')) {
                        this._disableNav('prev')
                    }
                    if (!this.d._isInRange(new Date(y, m+1, 1), 'month')) {
                        this._disableNav('next')
                    }
                    break;
                case 'months':
                    if (!this.d._isInRange(new Date(y-1, m, d), 'year')) {
                        this._disableNav('prev')
                    }
                    if (!this.d._isInRange(new Date(y+1, m, d), 'year')) {
                        this._disableNav('next')
                    }
                    break;
                case 'years':
                    var decade = dp.getDecade(this.d.date);
                    if (!this.d._isInRange(new Date(decade[0] - 1, 0, 1), 'year')) {
                        this._disableNav('prev')
                    }
                    if (!this.d._isInRange(new Date(decade[1] + 1, 0, 1), 'year')) {
                        this._disableNav('next')
                    }
                    break;
            }
        },

        _disableNav: function (nav) {
            $('[data-action="' + nav + '"]', this.d.$nav).addClass('-disabled-')
        },

        _activateNav: function (nav) {
            $('[data-action="' + nav + '"]', this.d.$nav).removeClass('-disabled-')
        },

        _onClickNavButton: function (e) {
            var $el = $(e.target).closest('[data-action]'),
                action = $el.data('action');

            this.d[action]();
        },

        _onClickNavTitle: function (e) {
            if ($(e.target).hasClass('-disabled-')) return;

            if (this.d.view == 'days') {
                return this.d.view = 'months'
            }

            this.d.view = 'years';
        }
    }

})();

;(function () {
    var template = '<div class="datepicker--time">' +
        '<div class="datepicker--time-current">' +
        '   <span class="datepicker--time-current-hours">#{hourVisible}</span>' +
        '   <span class="datepicker--time-current-colon">:</span>' +
        '   <span class="datepicker--time-current-minutes">#{minValue}</span>' +
        '</div>' +
        '<div class="datepicker--time-sliders">' +
        '   <div class="datepicker--time-row">' +
        '      <input type="range" name="hours" value="#{hourValue}" min="#{hourMin}" max="#{hourMax}" step="#{hourStep}"/>' +
        '   </div>' +
        '   <div class="datepicker--time-row">' +
        '      <input type="range" name="minutes" value="#{minValue}" min="#{minMin}" max="#{minMax}" step="#{minStep}"/>' +
        '   </div>' +
        '</div>' +
        '</div>',
        datepicker = $.fn.datepicker,
        dp = datepicker.Constructor;

    datepicker.Timepicker = function (inst, opts) {
        this.d = inst;
        this.opts = opts;

        this.init();
    };

    datepicker.Timepicker.prototype = {
        init: function () {
            var input = 'input';
            this._setTime(this.d.date);
            this._buildHTML();

            if (navigator.userAgent.match(/trident/gi)) {
                input = 'change';
            }

            this.d.$el.on('selectDate', this._onSelectDate.bind(this));
            this.$ranges.on(input, this._onChangeRange.bind(this));
            this.$ranges.on('mouseup', this._onMouseUpRange.bind(this));
            this.$ranges.on('mousemove focus ', this._onMouseEnterRange.bind(this));
            this.$ranges.on('mouseout blur', this._onMouseOutRange.bind(this));
        },

        _setTime: function (date) {
            var _date = dp.getParsedDate(date);

            this._handleDate(date);
            this.hours = _date.hours < this.minHours ? this.minHours : _date.hours;
            this.minutes = _date.minutes < this.minMinutes ? this.minMinutes : _date.minutes;
        },

        /**
         * Sets minHours and minMinutes from date (usually it's a minDate)
         * Also changes minMinutes if current hours are bigger then @date hours
         * @param date {Date}
         * @private
         */
        _setMinTimeFromDate: function (date) {
            this.minHours = date.getHours();
            this.minMinutes = date.getMinutes();

            // If, for example, min hours are 10, and current hours are 12,
            // update minMinutes to default value, to be able to choose whole range of values
            if (this.d.lastSelectedDate) {
                if (this.d.lastSelectedDate.getHours() > date.getHours()) {
                    this.minMinutes = this.opts.minMinutes;
                }
            }
        },

        _setMaxTimeFromDate: function (date) {
            this.maxHours = date.getHours();
            this.maxMinutes = date.getMinutes();

            if (this.d.lastSelectedDate) {
                if (this.d.lastSelectedDate.getHours() < date.getHours()) {
                    this.maxMinutes = this.opts.maxMinutes;
                }
            }
        },

        _setDefaultMinMaxTime: function () {
            var maxHours = 23,
                maxMinutes = 59,
                opts = this.opts;

            this.minHours = opts.minHours < 0 || opts.minHours > maxHours ? 0 : opts.minHours;
            this.minMinutes = opts.minMinutes < 0 || opts.minMinutes > maxMinutes ? 0 : opts.minMinutes;
            this.maxHours = opts.maxHours < 0 || opts.maxHours > maxHours ? maxHours : opts.maxHours;
            this.maxMinutes = opts.maxMinutes < 0 || opts.maxMinutes > maxMinutes ? maxMinutes : opts.maxMinutes;
        },

        /**
         * Looks for min/max hours/minutes and if current values
         * are out of range sets valid values.
         * @private
         */
        _validateHoursMinutes: function (date) {
            if (this.hours < this.minHours) {
                this.hours = this.minHours;
            } else if (this.hours > this.maxHours) {
                this.hours = this.maxHours;
            }

            if (this.minutes < this.minMinutes) {
                this.minutes = this.minMinutes;
            } else if (this.minutes > this.maxMinutes) {
                this.minutes = this.maxMinutes;
            }
        },

        _buildHTML: function () {
            var lz = dp.getLeadingZeroNum,
                data = {
                    hourMin: this.minHours,
                    hourMax: lz(this.maxHours),
                    hourStep: this.opts.hoursStep,
                    hourValue: this.hours,
                    hourVisible: lz(this.displayHours),
                    minMin: this.minMinutes,
                    minMax: lz(this.maxMinutes),
                    minStep: this.opts.minutesStep,
                    minValue: lz(this.minutes)
                },
                _template = dp.template(template, data);

            this.$timepicker = $(_template).appendTo(this.d.$datepicker);
            this.$ranges = $('[type="range"]', this.$timepicker);
            this.$hours = $('[name="hours"]', this.$timepicker);
            this.$minutes = $('[name="minutes"]', this.$timepicker);
            this.$hoursText = $('.datepicker--time-current-hours', this.$timepicker);
            this.$minutesText = $('.datepicker--time-current-minutes', this.$timepicker);

            if (this.d.ampm) {
                this.$ampm = $('<span class="datepicker--time-current-ampm">')
                    .appendTo($('.datepicker--time-current', this.$timepicker))
                    .html(this.dayPeriod);

                this.$timepicker.addClass('-am-pm-');
            }
        },

        _updateCurrentTime: function () {
            var h =  dp.getLeadingZeroNum(this.displayHours),
                m = dp.getLeadingZeroNum(this.minutes);

            this.$hoursText.html(h);
            this.$minutesText.html(m);

            if (this.d.ampm) {
                this.$ampm.html(this.dayPeriod);
            }
        },

        _updateRanges: function () {
            this.$hours.attr({
                min: this.minHours,
                max: this.maxHours
            }).val(this.hours);

            this.$minutes.attr({
                min: this.minMinutes,
                max: this.maxMinutes
            }).val(this.minutes)
        },

        /**
         * Sets minHours, minMinutes etc. from date. If date is not passed, than sets
         * values from options
         * @param [date] {object} - Date object, to get values from
         * @private
         */
        _handleDate: function (date) {
            this._setDefaultMinMaxTime();
            if (date) {
                if (dp.isSame(date, this.d.opts.minDate)) {
                    this._setMinTimeFromDate(this.d.opts.minDate);
                } else if (dp.isSame(date, this.d.opts.maxDate)) {
                    this._setMaxTimeFromDate(this.d.opts.maxDate);
                }
            }

            this._validateHoursMinutes(date);
        },

        update: function () {
            this._updateRanges();
            this._updateCurrentTime();
        },

        /**
         * Calculates valid hour value to display in text input and datepicker's body.
         * @param date {Date|Number} - date or hours
         * @param [ampm] {Boolean} - 12 hours mode
         * @returns {{hours: *, dayPeriod: string}}
         * @private
         */
        _getValidHoursFromDate: function (date, ampm) {
            var d = date,
                hours = date;

            if (date instanceof Date) {
                d = dp.getParsedDate(date);
                hours = d.hours;
            }

            var _ampm = ampm || this.d.ampm,
                dayPeriod = 'am';

            if (_ampm) {
                switch(true) {
                    case hours == 0:
                        hours = 12;
                        break;
                    case hours == 12:
                        dayPeriod = 'pm';
                        break;
                    case hours > 11:
                        hours = hours - 12;
                        dayPeriod = 'pm';
                        break;
                    default:
                        break;
                }
            }

            return {
                hours: hours,
                dayPeriod: dayPeriod
            }
        },

        set hours (val) {
            this._hours = val;

            var displayHours = this._getValidHoursFromDate(val);

            this.displayHours = displayHours.hours;
            this.dayPeriod = displayHours.dayPeriod;
        },

        get hours() {
            return this._hours;
        },

        //  Events
        // -------------------------------------------------

        _onChangeRange: function (e) {
            var $target = $(e.target),
                name = $target.attr('name');
            
            this.d.timepickerIsActive = true;

            this[name] = $target.val();
            this._updateCurrentTime();
            this.d._trigger('timeChange', [this.hours, this.minutes]);

            this._handleDate(this.d.lastSelectedDate);
            this.update()
        },

        _onSelectDate: function (e, data) {
            this._handleDate(data);
            this.update();
        },

        _onMouseEnterRange: function (e) {
            var name = $(e.target).attr('name');
            $('.datepicker--time-current-' + name, this.$timepicker).addClass('-focus-');
        },

        _onMouseOutRange: function (e) {
            var name = $(e.target).attr('name');
            if (this.d.inFocus) return; // Prevent removing focus when mouse out of range slider
            $('.datepicker--time-current-' + name, this.$timepicker).removeClass('-focus-');
        },

        _onMouseUpRange: function (e) {
            this.d.timepickerIsActive = false;
        }
    };
})();
 })(window, jQuery);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRhdGVwaWNrZXIuanMiLCJib2R5LmpzIiwibmF2aWdhdGlvbi5qcyIsInRpbWVwaWNrZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2L0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZGF0ZXBpY2tlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIjsoZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIFZFUlNJT04gPSAnMi4yLjInLFxyXG4gICAgICAgIHBsdWdpbk5hbWUgPSAnZGF0ZXBpY2tlcicsXHJcbiAgICAgICAgYXV0b0luaXRTZWxlY3RvciA9ICcuZGF0ZXBpY2tlci1oZXJlJyxcclxuICAgICAgICAkYm9keSwgJGRhdGVwaWNrZXJzQ29udGFpbmVyLFxyXG4gICAgICAgIGNvbnRhaW5lckJ1aWx0ID0gZmFsc2UsXHJcbiAgICAgICAgYmFzZVRlbXBsYXRlID0gJycgK1xyXG4gICAgICAgICAgICAnPGRpdiBjbGFzcz1cImRhdGVwaWNrZXJcIj4nICtcclxuICAgICAgICAgICAgJzxpIGNsYXNzPVwiZGF0ZXBpY2tlci0tcG9pbnRlclwiPjwvaT4nICtcclxuICAgICAgICAgICAgJzxuYXYgY2xhc3M9XCJkYXRlcGlja2VyLS1uYXZcIj48L25hdj4nICtcclxuICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJkYXRlcGlja2VyLS1jb250ZW50XCI+PC9kaXY+JyArXHJcbiAgICAgICAgICAgICc8L2Rpdj4nLFxyXG4gICAgICAgIGRlZmF1bHRzID0ge1xyXG4gICAgICAgICAgICBjbGFzc2VzOiAnJyxcclxuICAgICAgICAgICAgaW5saW5lOiBmYWxzZSxcclxuICAgICAgICAgICAgbGFuZ3VhZ2U6ICdydScsXHJcbiAgICAgICAgICAgIHN0YXJ0RGF0ZTogbmV3IERhdGUoKSxcclxuICAgICAgICAgICAgZmlyc3REYXk6ICcnLFxyXG4gICAgICAgICAgICB3ZWVrZW5kczogWzYsIDBdLFxyXG4gICAgICAgICAgICBkYXRlRm9ybWF0OiAnJyxcclxuICAgICAgICAgICAgYWx0RmllbGQ6ICcnLFxyXG4gICAgICAgICAgICBhbHRGaWVsZERhdGVGb3JtYXQ6ICdAJyxcclxuICAgICAgICAgICAgdG9nZ2xlU2VsZWN0ZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIGtleWJvYXJkTmF2OiB0cnVlLFxyXG5cclxuICAgICAgICAgICAgY2FsZW5kYXJzOiAxLFxyXG5cclxuXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiAnYm90dG9tIGxlZnQnLFxyXG4gICAgICAgICAgICBvZmZzZXQ6IDEyLFxyXG5cclxuICAgICAgICAgICAgdmlldzogJ2RheXMnLFxyXG4gICAgICAgICAgICBtaW5WaWV3OiAnZGF5cycsXHJcblxyXG4gICAgICAgICAgICBzaG93T3RoZXJNb250aHM6IHRydWUsXHJcbiAgICAgICAgICAgIHNlbGVjdE90aGVyTW9udGhzOiB0cnVlLFxyXG4gICAgICAgICAgICBtb3ZlVG9PdGhlck1vbnRoc09uU2VsZWN0OiB0cnVlLFxyXG5cclxuICAgICAgICAgICAgc2hvd090aGVyWWVhcnM6IHRydWUsXHJcbiAgICAgICAgICAgIHNlbGVjdE90aGVyWWVhcnM6IHRydWUsXHJcbiAgICAgICAgICAgIG1vdmVUb090aGVyWWVhcnNPblNlbGVjdDogdHJ1ZSxcclxuXHJcbiAgICAgICAgICAgIG1pbkRhdGU6ICcnLFxyXG4gICAgICAgICAgICBtYXhEYXRlOiAnJyxcclxuICAgICAgICAgICAgZGlzYWJsZU5hdldoZW5PdXRPZlJhbmdlOiB0cnVlLFxyXG5cclxuICAgICAgICAgICAgbXVsdGlwbGVEYXRlczogZmFsc2UsIC8vIEJvb2xlYW4gb3IgTnVtYmVyXHJcbiAgICAgICAgICAgIG11bHRpcGxlRGF0ZXNTZXBhcmF0b3I6ICcsJyxcclxuICAgICAgICAgICAgcmFuZ2U6IGZhbHNlLFxyXG5cclxuICAgICAgICAgICAgdG9kYXlCdXR0b246IGZhbHNlLFxyXG4gICAgICAgICAgICBjbGVhckJ1dHRvbjogZmFsc2UsXHJcblxyXG4gICAgICAgICAgICBzaG93RXZlbnQ6ICdmb2N1cycsXHJcbiAgICAgICAgICAgIGF1dG9DbG9zZTogZmFsc2UsXHJcblxyXG4gICAgICAgICAgICAvLyBuYXZpZ2F0aW9uXHJcbiAgICAgICAgICAgIG1vbnRoc0ZpZWxkOiAnbW9udGhzU2hvcnQnLFxyXG4gICAgICAgICAgICBwcmV2SHRtbDogJzxzdmc+PHBhdGggZD1cIk0gMTcsMTIgbCAtNSw1IGwgNSw1XCI+PC9wYXRoPjwvc3ZnPicsXHJcbiAgICAgICAgICAgIG5leHRIdG1sOiAnPHN2Zz48cGF0aCBkPVwiTSAxNCwxMiBsIDUsNSBsIC01LDVcIj48L3BhdGg+PC9zdmc+JyxcclxuICAgICAgICAgICAgbmF2VGl0bGVzOiB7XHJcbiAgICAgICAgICAgICAgICBkYXlzOiAnTU0sIDxpPnl5eXk8L2k+JyxcclxuICAgICAgICAgICAgICAgIG1vbnRoczogJ3l5eXknLFxyXG4gICAgICAgICAgICAgICAgeWVhcnM6ICd5eXl5MSAtIHl5eXkyJ1xyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgLy8gdGltZXBpY2tlclxyXG4gICAgICAgICAgICB0aW1lcGlja2VyOiBmYWxzZSxcclxuICAgICAgICAgICAgb25seVRpbWVwaWNrZXI6IGZhbHNlLFxyXG4gICAgICAgICAgICBkYXRlVGltZVNlcGFyYXRvcjogJyAnLFxyXG4gICAgICAgICAgICB0aW1lRm9ybWF0OiAnJyxcclxuICAgICAgICAgICAgbWluSG91cnM6IDAsXHJcbiAgICAgICAgICAgIG1heEhvdXJzOiAyNCxcclxuICAgICAgICAgICAgbWluTWludXRlczogMCxcclxuICAgICAgICAgICAgbWF4TWludXRlczogNTksXHJcbiAgICAgICAgICAgIGhvdXJzU3RlcDogMSxcclxuICAgICAgICAgICAgbWludXRlc1N0ZXA6IDEsXHJcblxyXG4gICAgICAgICAgICAvLyBldmVudHNcclxuICAgICAgICAgICAgb25TZWxlY3Q6ICcnLFxyXG4gICAgICAgICAgICBvblNob3c6ICcnLFxyXG4gICAgICAgICAgICBvbkhpZGU6ICcnLFxyXG4gICAgICAgICAgICBvbkNoYW5nZU1vbnRoOiAnJyxcclxuICAgICAgICAgICAgb25DaGFuZ2VZZWFyOiAnJyxcclxuICAgICAgICAgICAgb25DaGFuZ2VEZWNhZGU6ICcnLFxyXG4gICAgICAgICAgICBvbkNoYW5nZVZpZXc6ICcnLFxyXG4gICAgICAgICAgICBvblJlbmRlckNlbGw6ICcnXHJcbiAgICAgICAgfSxcclxuICAgICAgICBob3RLZXlzID0ge1xyXG4gICAgICAgICAgICAnY3RybFJpZ2h0JzogWzE3LCAzOV0sXHJcbiAgICAgICAgICAgICdjdHJsVXAnOiBbMTcsIDM4XSxcclxuICAgICAgICAgICAgJ2N0cmxMZWZ0JzogWzE3LCAzN10sXHJcbiAgICAgICAgICAgICdjdHJsRG93bic6IFsxNywgNDBdLFxyXG4gICAgICAgICAgICAnc2hpZnRSaWdodCc6IFsxNiwgMzldLFxyXG4gICAgICAgICAgICAnc2hpZnRVcCc6IFsxNiwgMzhdLFxyXG4gICAgICAgICAgICAnc2hpZnRMZWZ0JzogWzE2LCAzN10sXHJcbiAgICAgICAgICAgICdzaGlmdERvd24nOiBbMTYsIDQwXSxcclxuICAgICAgICAgICAgJ2FsdFVwJzogWzE4LCAzOF0sXHJcbiAgICAgICAgICAgICdhbHRSaWdodCc6IFsxOCwgMzldLFxyXG4gICAgICAgICAgICAnYWx0TGVmdCc6IFsxOCwgMzddLFxyXG4gICAgICAgICAgICAnYWx0RG93bic6IFsxOCwgNDBdLFxyXG4gICAgICAgICAgICAnY3RybFNoaWZ0VXAnOiBbMTYsIDE3LCAzOF1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGRhdGVwaWNrZXI7XHJcblxyXG4gICAgdmFyIERhdGVwaWNrZXIgID0gZnVuY3Rpb24gKGVsLCBvcHRpb25zKSB7XHJcbiAgICAgICAgdGhpcy5lbCA9IGVsO1xyXG4gICAgICAgIHRoaXMuJGVsID0gJChlbCk7XHJcblxyXG4gICAgICAgIHRoaXMub3B0cyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkZWZhdWx0cywgb3B0aW9ucywgdGhpcy4kZWwuZGF0YSgpKTtcclxuXHJcbiAgICAgICAgaWYgKCRib2R5ID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAkYm9keSA9ICQoJ2JvZHknKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5vcHRzLnN0YXJ0RGF0ZSkge1xyXG4gICAgICAgICAgICB0aGlzLm9wdHMuc3RhcnREYXRlID0gbmV3IERhdGUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmVsLm5vZGVOYW1lID09ICdJTlBVVCcpIHtcclxuICAgICAgICAgICAgdGhpcy5lbElzSW5wdXQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMub3B0cy5hbHRGaWVsZCkge1xyXG4gICAgICAgICAgICB0aGlzLiRhbHRGaWVsZCA9IHR5cGVvZiB0aGlzLm9wdHMuYWx0RmllbGQgPT0gJ3N0cmluZycgPyAkKHRoaXMub3B0cy5hbHRGaWVsZCkgOiB0aGlzLm9wdHMuYWx0RmllbGQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5vcHRzLmNhbGVuZGFycyA+IDEpIHtcclxuICAgICAgICAgICAgIHRoaXMub3B0cy5zaG93T3RoZXJNb250aHMgPSBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuaW5pdGVkID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5zaWxlbnQgPSBmYWxzZTsgLy8gTmVlZCB0byBwcmV2ZW50IHVubmVjZXNzYXJ5IHJlbmRlcmluZ1xyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnREYXRlID0gdGhpcy5vcHRzLnN0YXJ0RGF0ZTtcclxuICAgICAgICB0aGlzLmN1cnJlbnRWaWV3ID0gdGhpcy5vcHRzLnZpZXc7XHJcbiAgICAgICAgdGhpcy5fY3JlYXRlU2hvcnRDdXRzKCk7XHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZERhdGVzID0gW107XHJcbiAgICAgICAgdGhpcy52aWV3cyA9IHt9O1xyXG4gICAgICAgIHRoaXMua2V5cyA9IFtdO1xyXG4gICAgICAgIHRoaXMubWluUmFuZ2UgPSAnJztcclxuICAgICAgICB0aGlzLm1heFJhbmdlID0gJyc7XHJcbiAgICAgICAgdGhpcy5fcHJldk9uU2VsZWN0VmFsdWUgPSAnJztcclxuXHJcbiAgICAgICAgdGhpcy5pbml0KClcclxuICAgIH07XHJcblxyXG4gICAgZGF0ZXBpY2tlciA9IERhdGVwaWNrZXI7XHJcblxyXG4gICAgZGF0ZXBpY2tlci5wcm90b3R5cGUgPSB7XHJcbiAgICAgICAgVkVSU0lPTjogVkVSU0lPTixcclxuICAgICAgICB2aWV3SW5kZXhlczogWydkYXlzJywgJ21vbnRocycsICd5ZWFycyddLFxyXG5cclxuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmICghY29udGFpbmVyQnVpbHQgJiYgIXRoaXMub3B0cy5pbmxpbmUgJiYgdGhpcy5lbElzSW5wdXQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2J1aWxkRGF0ZXBpY2tlcnNDb250YWluZXIoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLl9idWlsZEJhc2VIdG1sKCk7XHJcbiAgICAgICAgICAgIHRoaXMuX2RlZmluZUxvY2FsZSh0aGlzLm9wdHMubGFuZ3VhZ2UpO1xyXG4gICAgICAgICAgICB0aGlzLl9zeW5jV2l0aE1pbk1heERhdGVzKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5lbElzSW5wdXQpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5vcHRzLmlubGluZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBleHRyYSBjbGFzc2VzIGZvciBwcm9wZXIgdHJhbnNpdGlvbnNcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9zZXRQb3NpdGlvbkNsYXNzZXModGhpcy5vcHRzLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9iaW5kRXZlbnRzKClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9wdHMua2V5Ym9hcmROYXYgJiYgIXRoaXMub3B0cy5vbmx5VGltZXBpY2tlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2JpbmRLZXlib2FyZEV2ZW50cygpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy4kZGF0ZXBpY2tlci5vbignbW91c2Vkb3duJywgdGhpcy5fb25Nb3VzZURvd25EYXRlcGlja2VyLmJpbmQodGhpcykpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kZGF0ZXBpY2tlci5vbignbW91c2V1cCcsIHRoaXMuX29uTW91c2VVcERhdGVwaWNrZXIuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdHMuY2xhc3Nlcykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kZGF0ZXBpY2tlci5hZGRDbGFzcyh0aGlzLm9wdHMuY2xhc3NlcylcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMub3B0cy50aW1lcGlja2VyKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVwaWNrZXIgPSBuZXcgJC5mbi5kYXRlcGlja2VyLlRpbWVwaWNrZXIodGhpcywgdGhpcy5vcHRzKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2JpbmRUaW1lcGlja2VyRXZlbnRzKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdHMub25seVRpbWVwaWNrZXIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGRhdGVwaWNrZXIuYWRkQ2xhc3MoJy1vbmx5LXRpbWVwaWNrZXItJyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdHMuY2FsZW5kYXJzID4gMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kZGF0ZXBpY2tlci5hZGRDbGFzcygnLW11bHRpcGxlLWNhbHMtJyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBpID0gMDtcclxuXHJcbiAgICAgICAgICAgIHRoaXMudmlld3NbdGhpcy5jdXJyZW50Vmlld10gPSBbXTtcclxuXHJcbiAgICAgICAgICAgIHdoaWxlKGkgPCB0aGlzLm9wdHMuY2FsZW5kYXJzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnZpZXdzW3RoaXMuY3VycmVudFZpZXddLnB1c2gobmV3ICQuZm4uZGF0ZXBpY2tlci5Cb2R5KHRoaXMsIHRoaXMuY3VycmVudFZpZXcsIHRoaXMub3B0cywgaSkpXHJcbiAgICAgICAgICAgICAgICB0aGlzLnZpZXdzW3RoaXMuY3VycmVudFZpZXddW2ldLnNob3coKTtcclxuICAgICAgICAgICAgICAgIGkrKztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gdGhpcy52aWV3c1t0aGlzLmN1cnJlbnRWaWV3XSA9IG5ldyAkLmZuLmRhdGVwaWNrZXIuQm9keSh0aGlzLCB0aGlzLmN1cnJlbnRWaWV3LCB0aGlzLm9wdHMpO1xyXG4gICAgICAgICAgICAvLyB0aGlzLnZpZXdzW3RoaXMuY3VycmVudFZpZXddLnNob3coKTtcclxuXHJcblxyXG4gICAgICAgICAgICB0aGlzLm5hdiA9IG5ldyAkLmZuLmRhdGVwaWNrZXIuTmF2aWdhdGlvbih0aGlzLCB0aGlzLm9wdHMpO1xyXG4gICAgICAgICAgICB0aGlzLnZpZXcgPSB0aGlzLmN1cnJlbnRWaWV3O1xyXG5cclxuICAgICAgICAgICAgdGhpcy4kZWwub24oJ2NsaWNrQ2VsbC5hZHAnLCB0aGlzLl9vbkNsaWNrQ2VsbC5iaW5kKHRoaXMpKTtcclxuICAgICAgICAgICAgdGhpcy4kZGF0ZXBpY2tlci5vbignbW91c2VlbnRlcicsICcuZGF0ZXBpY2tlci0tY2VsbCcsIHRoaXMuX29uTW91c2VFbnRlckNlbGwuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgICAgIHRoaXMuJGRhdGVwaWNrZXIub24oJ21vdXNlbGVhdmUnLCAnLmRhdGVwaWNrZXItLWNlbGwnLCB0aGlzLl9vbk1vdXNlTGVhdmVDZWxsLmJpbmQodGhpcykpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5pbml0ZWQgPSB0cnVlO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9jcmVhdGVTaG9ydEN1dHM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGhpcy5taW5EYXRlID0gdGhpcy5vcHRzLm1pbkRhdGUgPyB0aGlzLm9wdHMubWluRGF0ZSA6IG5ldyBEYXRlKC04NjM5OTk5OTEzNjAwMDAwKTtcclxuICAgICAgICAgICAgdGhpcy5tYXhEYXRlID0gdGhpcy5vcHRzLm1heERhdGUgPyB0aGlzLm9wdHMubWF4RGF0ZSA6IG5ldyBEYXRlKDg2Mzk5OTk5MTM2MDAwMDApO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9iaW5kRXZlbnRzIDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0aGlzLiRlbC5vbih0aGlzLm9wdHMuc2hvd0V2ZW50ICsgJy5hZHAnLCB0aGlzLl9vblNob3dFdmVudC5iaW5kKHRoaXMpKTtcclxuICAgICAgICAgICAgdGhpcy4kZWwub24oJ21vdXNldXAuYWRwJywgdGhpcy5fb25Nb3VzZVVwRWwuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgICAgIHRoaXMuJGVsLm9uKCdibHVyLmFkcCcsIHRoaXMuX29uQmx1ci5iaW5kKHRoaXMpKTtcclxuICAgICAgICAgICAgdGhpcy4kZWwub24oJ2tleXVwLmFkcCcsIHRoaXMuX29uS2V5VXBHZW5lcmFsLmJpbmQodGhpcykpO1xyXG4gICAgICAgICAgICAkKHdpbmRvdykub24oJ3Jlc2l6ZS5hZHAnLCB0aGlzLl9vblJlc2l6ZS5iaW5kKHRoaXMpKTtcclxuICAgICAgICAgICAgJCgnYm9keScpLm9uKCdtb3VzZXVwLmFkcCcsIHRoaXMuX29uTW91c2VVcEJvZHkuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2JpbmRLZXlib2FyZEV2ZW50czogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0aGlzLiRlbC5vbigna2V5ZG93bi5hZHAnLCB0aGlzLl9vbktleURvd24uYmluZCh0aGlzKSk7XHJcbiAgICAgICAgICAgIHRoaXMuJGVsLm9uKCdrZXl1cC5hZHAnLCB0aGlzLl9vbktleVVwLmJpbmQodGhpcykpO1xyXG4gICAgICAgICAgICB0aGlzLiRlbC5vbignaG90S2V5LmFkcCcsIHRoaXMuX29uSG90S2V5LmJpbmQodGhpcykpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9iaW5kVGltZXBpY2tlckV2ZW50czogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0aGlzLiRlbC5vbigndGltZUNoYW5nZS5hZHAnLCB0aGlzLl9vblRpbWVDaGFuZ2UuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgaXNXZWVrZW5kOiBmdW5jdGlvbiAoZGF5KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9wdHMud2Vla2VuZHMuaW5kZXhPZihkYXkpICE9PSAtMTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfZGVmaW5lTG9jYWxlOiBmdW5jdGlvbiAobGFuZykge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIGxhbmcgPT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubG9jID0gJC5mbi5kYXRlcGlja2VyLmxhbmd1YWdlW2xhbmddO1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmxvYykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignQ2FuXFwndCBmaW5kIGxhbmd1YWdlIFwiJyArIGxhbmcgKyAnXCIgaW4gRGF0ZXBpY2tlci5sYW5ndWFnZSwgd2lsbCB1c2UgXCJydVwiIGluc3RlYWQnKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYyA9ICQuZXh0ZW5kKHRydWUsIHt9LCAkLmZuLmRhdGVwaWNrZXIubGFuZ3VhZ2UucnUpXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5sb2MgPSAkLmV4dGVuZCh0cnVlLCB7fSwgJC5mbi5kYXRlcGlja2VyLmxhbmd1YWdlLnJ1LCAkLmZuLmRhdGVwaWNrZXIubGFuZ3VhZ2VbbGFuZ10pXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxvYyA9ICQuZXh0ZW5kKHRydWUsIHt9LCAkLmZuLmRhdGVwaWNrZXIubGFuZ3VhZ2UucnUsIGxhbmcpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdHMuZGF0ZUZvcm1hdCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sb2MuZGF0ZUZvcm1hdCA9IHRoaXMub3B0cy5kYXRlRm9ybWF0XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdHMudGltZUZvcm1hdCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sb2MudGltZUZvcm1hdCA9IHRoaXMub3B0cy50aW1lRm9ybWF0XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdHMuZmlyc3REYXkgIT09ICcnKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxvYy5maXJzdERheSA9IHRoaXMub3B0cy5maXJzdERheVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRzLnRpbWVwaWNrZXIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubG9jLmRhdGVGb3JtYXQgPSBbdGhpcy5sb2MuZGF0ZUZvcm1hdCwgdGhpcy5sb2MudGltZUZvcm1hdF0uam9pbih0aGlzLm9wdHMuZGF0ZVRpbWVTZXBhcmF0b3IpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRzLm9ubHlUaW1lcGlja2VyKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxvYy5kYXRlRm9ybWF0ID0gdGhpcy5sb2MudGltZUZvcm1hdDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdmFyIGJvdW5kYXJ5ID0gdGhpcy5fZ2V0V29yZEJvdW5kYXJ5UmVnRXhwO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5sb2MudGltZUZvcm1hdC5tYXRjaChib3VuZGFyeSgnYWEnKSkgfHxcclxuICAgICAgICAgICAgICAgIHRoaXMubG9jLnRpbWVGb3JtYXQubWF0Y2goYm91bmRhcnkoJ0FBJykpXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICB0aGlzLmFtcG0gPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2J1aWxkRGF0ZXBpY2tlcnNDb250YWluZXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgY29udGFpbmVyQnVpbHQgPSB0cnVlO1xyXG4gICAgICAgICAgICAkYm9keS5hcHBlbmQoJzxkaXYgY2xhc3M9XCJkYXRlcGlja2Vycy1jb250YWluZXJcIiBpZD1cImRhdGVwaWNrZXJzLWNvbnRhaW5lclwiPjwvZGl2PicpO1xyXG4gICAgICAgICAgICAkZGF0ZXBpY2tlcnNDb250YWluZXIgPSAkKCcjZGF0ZXBpY2tlcnMtY29udGFpbmVyJyk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2J1aWxkQmFzZUh0bWw6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyICRhcHBlbmRUYXJnZXQsXHJcbiAgICAgICAgICAgICAgICAkaW5saW5lID0gJCgnPGRpdiBjbGFzcz1cImRhdGVwaWNrZXItaW5saW5lXCI+Jyk7XHJcblxyXG4gICAgICAgICAgICBpZih0aGlzLmVsLm5vZGVOYW1lID09ICdJTlBVVCcpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5vcHRzLmlubGluZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICRhcHBlbmRUYXJnZXQgPSAkZGF0ZXBpY2tlcnNDb250YWluZXI7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICRhcHBlbmRUYXJnZXQgPSAkaW5saW5lLmluc2VydEFmdGVyKHRoaXMuJGVsKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgJGFwcGVuZFRhcmdldCA9ICRpbmxpbmUuYXBwZW5kVG8odGhpcy4kZWwpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuJGRhdGVwaWNrZXIgPSAkKGJhc2VUZW1wbGF0ZSkuYXBwZW5kVG8oJGFwcGVuZFRhcmdldCk7XHJcbiAgICAgICAgICAgIHRoaXMuJGNvbnRlbnQgPSAkKCcuZGF0ZXBpY2tlci0tY29udGVudCcsIHRoaXMuJGRhdGVwaWNrZXIpO1xyXG4gICAgICAgICAgICB0aGlzLiRuYXYgPSAkKCcuZGF0ZXBpY2tlci0tbmF2JywgdGhpcy4kZGF0ZXBpY2tlcik7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX3RyaWdnZXJPbkNoYW5nZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuc2VsZWN0ZWREYXRlcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgIC8vIFByZXZlbnQgZnJvbSB0cmlnZ2VyaW5nIG11bHRpcGxlIG9uU2VsZWN0IGNhbGxiYWNrIHdpdGggc2FtZSBhcmd1bWVudCAoZW1wdHkgc3RyaW5nKSBpbiBJRTEwLTExXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fcHJldk9uU2VsZWN0VmFsdWUgPT09ICcnKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9wcmV2T25TZWxlY3RWYWx1ZSA9ICcnO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMub3B0cy5vblNlbGVjdCgnJywgJycsIHRoaXMpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgc2VsZWN0ZWREYXRlcyA9IHRoaXMuc2VsZWN0ZWREYXRlcyxcclxuICAgICAgICAgICAgICAgIHBhcnNlZFNlbGVjdGVkID0gZGF0ZXBpY2tlci5nZXRQYXJzZWREYXRlKHNlbGVjdGVkRGF0ZXNbMF0pLFxyXG4gICAgICAgICAgICAgICAgZm9ybWF0dGVkRGF0ZXMsXHJcbiAgICAgICAgICAgICAgICBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgICAgICAgICBkYXRlcyA9IG5ldyBEYXRlKFxyXG4gICAgICAgICAgICAgICAgICAgIHBhcnNlZFNlbGVjdGVkLnllYXIsXHJcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VkU2VsZWN0ZWQubW9udGgsXHJcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VkU2VsZWN0ZWQuZGF0ZSxcclxuICAgICAgICAgICAgICAgICAgICBwYXJzZWRTZWxlY3RlZC5ob3VycyxcclxuICAgICAgICAgICAgICAgICAgICBwYXJzZWRTZWxlY3RlZC5taW51dGVzXHJcbiAgICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvcm1hdHRlZERhdGVzID0gc2VsZWN0ZWREYXRlcy5tYXAoZnVuY3Rpb24gKGRhdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gX3RoaXMuZm9ybWF0RGF0ZShfdGhpcy5sb2MuZGF0ZUZvcm1hdCwgZGF0ZSlcclxuICAgICAgICAgICAgICAgIH0pLmpvaW4odGhpcy5vcHRzLm11bHRpcGxlRGF0ZXNTZXBhcmF0b3IpO1xyXG5cclxuICAgICAgICAgICAgLy8gQ3JlYXRlIG5ldyBkYXRlcyBhcnJheSwgdG8gc2VwYXJhdGUgaXQgZnJvbSBvcmlnaW5hbCBzZWxlY3RlZERhdGVzXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdHMubXVsdGlwbGVEYXRlcyB8fCB0aGlzLm9wdHMucmFuZ2UpIHtcclxuICAgICAgICAgICAgICAgIGRhdGVzID0gc2VsZWN0ZWREYXRlcy5tYXAoZnVuY3Rpb24oZGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJzZWREYXRlID0gZGF0ZXBpY2tlci5nZXRQYXJzZWREYXRlKGRhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRGF0ZShcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VkRGF0ZS55ZWFyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZWREYXRlLm1vbnRoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZWREYXRlLmRhdGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlZERhdGUuaG91cnMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlZERhdGUubWludXRlc1xyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLl9wcmV2T25TZWxlY3RWYWx1ZSA9IGZvcm1hdHRlZERhdGVzO1xyXG4gICAgICAgICAgICB0aGlzLm9wdHMub25TZWxlY3QoZm9ybWF0dGVkRGF0ZXMsIGRhdGVzLCB0aGlzKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBuZXh0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHZhciBkID0gdGhpcy5wYXJzZWREYXRlLFxyXG4gICAgICAgICAgICAgICAgbyA9IHRoaXMub3B0cztcclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLnZpZXcpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgJ2RheXMnOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGF0ZSA9IG5ldyBEYXRlKGQueWVhciwgZC5tb250aCArIDEsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvLm9uQ2hhbmdlTW9udGgpIG8ub25DaGFuZ2VNb250aCh0aGlzLnBhcnNlZERhdGUubW9udGgsIHRoaXMucGFyc2VkRGF0ZS55ZWFyKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ21vbnRocyc6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXRlID0gbmV3IERhdGUoZC55ZWFyICsgMSwgZC5tb250aCwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG8ub25DaGFuZ2VZZWFyKSBvLm9uQ2hhbmdlWWVhcih0aGlzLnBhcnNlZERhdGUueWVhcik7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICd5ZWFycyc6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXRlID0gbmV3IERhdGUoZC55ZWFyICsgMTAsIDAsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvLm9uQ2hhbmdlRGVjYWRlKSBvLm9uQ2hhbmdlRGVjYWRlKHRoaXMuY3VyRGVjYWRlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHByZXY6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIGQgPSB0aGlzLnBhcnNlZERhdGUsXHJcbiAgICAgICAgICAgICAgICBvID0gdGhpcy5vcHRzO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMudmlldykge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnZGF5cyc6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXRlID0gbmV3IERhdGUoZC55ZWFyLCBkLm1vbnRoIC0gMSwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG8ub25DaGFuZ2VNb250aCkgby5vbkNoYW5nZU1vbnRoKHRoaXMucGFyc2VkRGF0ZS5tb250aCwgdGhpcy5wYXJzZWREYXRlLnllYXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnbW9udGhzJzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRhdGUgPSBuZXcgRGF0ZShkLnllYXIgLSAxLCBkLm1vbnRoLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoby5vbkNoYW5nZVllYXIpIG8ub25DaGFuZ2VZZWFyKHRoaXMucGFyc2VkRGF0ZS55ZWFyKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ3llYXJzJzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRhdGUgPSBuZXcgRGF0ZShkLnllYXIgLSAxMCwgMCwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG8ub25DaGFuZ2VEZWNhZGUpIG8ub25DaGFuZ2VEZWNhZGUodGhpcy5jdXJEZWNhZGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZm9ybWF0RGF0ZTogZnVuY3Rpb24gKHN0cmluZywgZGF0ZSkge1xyXG4gICAgICAgICAgICBkYXRlID0gZGF0ZSB8fCB0aGlzLmRhdGU7XHJcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBzdHJpbmcsXHJcbiAgICAgICAgICAgICAgICBib3VuZGFyeSA9IHRoaXMuX2dldFdvcmRCb3VuZGFyeVJlZ0V4cCxcclxuICAgICAgICAgICAgICAgIGxvY2FsZSA9IHRoaXMubG9jLFxyXG4gICAgICAgICAgICAgICAgbGVhZGluZ1plcm8gPSBkYXRlcGlja2VyLmdldExlYWRpbmdaZXJvTnVtLFxyXG4gICAgICAgICAgICAgICAgZGVjYWRlID0gZGF0ZXBpY2tlci5nZXREZWNhZGUoZGF0ZSksXHJcbiAgICAgICAgICAgICAgICBkID0gZGF0ZXBpY2tlci5nZXRQYXJzZWREYXRlKGRhdGUpLFxyXG4gICAgICAgICAgICAgICAgZnVsbEhvdXJzID0gZC5mdWxsSG91cnMsXHJcbiAgICAgICAgICAgICAgICBob3VycyA9IGQuaG91cnMsXHJcbiAgICAgICAgICAgICAgICBhbXBtID0gc3RyaW5nLm1hdGNoKGJvdW5kYXJ5KCdhYScpKSB8fCBzdHJpbmcubWF0Y2goYm91bmRhcnkoJ0FBJykpLFxyXG4gICAgICAgICAgICAgICAgZGF5UGVyaW9kID0gJ2FtJyxcclxuICAgICAgICAgICAgICAgIHJlcGxhY2VyID0gdGhpcy5fcmVwbGFjZXIsXHJcbiAgICAgICAgICAgICAgICB2YWxpZEhvdXJzO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMub3B0cy50aW1lcGlja2VyICYmIHRoaXMudGltZXBpY2tlciAmJiBhbXBtKSB7XHJcbiAgICAgICAgICAgICAgICB2YWxpZEhvdXJzID0gdGhpcy50aW1lcGlja2VyLl9nZXRWYWxpZEhvdXJzRnJvbURhdGUoZGF0ZSwgYW1wbSk7XHJcbiAgICAgICAgICAgICAgICBmdWxsSG91cnMgPSBsZWFkaW5nWmVybyh2YWxpZEhvdXJzLmhvdXJzKTtcclxuICAgICAgICAgICAgICAgIGhvdXJzID0gdmFsaWRIb3Vycy5ob3VycztcclxuICAgICAgICAgICAgICAgIGRheVBlcmlvZCA9IHZhbGlkSG91cnMuZGF5UGVyaW9kO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKHRydWUpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgL0AvLnRlc3QocmVzdWx0KTpcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSByZXN1bHQucmVwbGFjZSgvQC8sIGRhdGUuZ2V0VGltZSgpKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgL2FhLy50ZXN0KHJlc3VsdCk6XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcmVwbGFjZXIocmVzdWx0LCBib3VuZGFyeSgnYWEnKSwgZGF5UGVyaW9kKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgL0FBLy50ZXN0KHJlc3VsdCk6XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcmVwbGFjZXIocmVzdWx0LCBib3VuZGFyeSgnQUEnKSwgZGF5UGVyaW9kLnRvVXBwZXJDYXNlKCkpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAvZGQvLnRlc3QocmVzdWx0KTpcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSByZXBsYWNlcihyZXN1bHQsIGJvdW5kYXJ5KCdkZCcpLCBkLmZ1bGxEYXRlKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgL2QvLnRlc3QocmVzdWx0KTpcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSByZXBsYWNlcihyZXN1bHQsIGJvdW5kYXJ5KCdkJyksIGQuZGF0ZSk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIC9ERC8udGVzdChyZXN1bHQpOlxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlcGxhY2VyKHJlc3VsdCwgYm91bmRhcnkoJ0REJyksIGxvY2FsZS5kYXlzW2QuZGF5XSk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIC9ELy50ZXN0KHJlc3VsdCk6XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcmVwbGFjZXIocmVzdWx0LCBib3VuZGFyeSgnRCcpLCBsb2NhbGUuZGF5c1Nob3J0W2QuZGF5XSk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIC9tbS8udGVzdChyZXN1bHQpOlxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlcGxhY2VyKHJlc3VsdCwgYm91bmRhcnkoJ21tJyksIGQuZnVsbE1vbnRoKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgL20vLnRlc3QocmVzdWx0KTpcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSByZXBsYWNlcihyZXN1bHQsIGJvdW5kYXJ5KCdtJyksIGQubW9udGggKyAxKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgL01NLy50ZXN0KHJlc3VsdCk6XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcmVwbGFjZXIocmVzdWx0LCBib3VuZGFyeSgnTU0nKSwgdGhpcy5sb2MubW9udGhzW2QubW9udGhdKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgL00vLnRlc3QocmVzdWx0KTpcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSByZXBsYWNlcihyZXN1bHQsIGJvdW5kYXJ5KCdNJyksIGxvY2FsZS5tb250aHNTaG9ydFtkLm1vbnRoXSk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIC9paS8udGVzdChyZXN1bHQpOlxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlcGxhY2VyKHJlc3VsdCwgYm91bmRhcnkoJ2lpJyksIGQuZnVsbE1pbnV0ZXMpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAvaS8udGVzdChyZXN1bHQpOlxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlcGxhY2VyKHJlc3VsdCwgYm91bmRhcnkoJ2knKSwgZC5taW51dGVzKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgL2hoLy50ZXN0KHJlc3VsdCk6XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcmVwbGFjZXIocmVzdWx0LCBib3VuZGFyeSgnaGgnKSwgZnVsbEhvdXJzKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgL2gvLnRlc3QocmVzdWx0KTpcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSByZXBsYWNlcihyZXN1bHQsIGJvdW5kYXJ5KCdoJyksIGhvdXJzKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgL3l5eXkvLnRlc3QocmVzdWx0KTpcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSByZXBsYWNlcihyZXN1bHQsIGJvdW5kYXJ5KCd5eXl5JyksIGQueWVhcik7XHJcbiAgICAgICAgICAgICAgICBjYXNlIC95eXl5MS8udGVzdChyZXN1bHQpOlxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlcGxhY2VyKHJlc3VsdCwgYm91bmRhcnkoJ3l5eXkxJyksIGRlY2FkZVswXSk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIC95eXl5Mi8udGVzdChyZXN1bHQpOlxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlcGxhY2VyKHJlc3VsdCwgYm91bmRhcnkoJ3l5eXkyJyksIGRlY2FkZVsxXSk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIC95eS8udGVzdChyZXN1bHQpOlxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlcGxhY2VyKHJlc3VsdCwgYm91bmRhcnkoJ3l5JyksIGQueWVhci50b1N0cmluZygpLnNsaWNlKC0yKSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX3JlcGxhY2VyOiBmdW5jdGlvbiAoc3RyLCByZWcsIGRhdGEpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHN0ci5yZXBsYWNlKHJlZywgZnVuY3Rpb24gKG1hdGNoLCBwMSxwMixwMykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHAxICsgZGF0YSArIHAzO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9nZXRXb3JkQm91bmRhcnlSZWdFeHA6IGZ1bmN0aW9uIChzaWduKSB7XHJcbiAgICAgICAgICAgIHZhciBzeW1ib2xzID0gJ1xcXFxzfFxcXFwufC18L3xcXFxcXFxcXHwsfFxcXFwkfFxcXFwhfFxcXFw/fDp8Oyc7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFJlZ0V4cCgnKF58PnwnICsgc3ltYm9scyArICcpKCcgKyBzaWduICsgJykoJHw8fCcgKyBzeW1ib2xzICsgJyknLCAnZycpO1xyXG4gICAgICAgIH0sXHJcblxyXG5cclxuICAgICAgICBzZWxlY3REYXRlOiBmdW5jdGlvbiAoZGF0ZSkge1xyXG4gICAgICAgICAgICB2YXIgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgICAgICAgICAgb3B0cyA9IF90aGlzLm9wdHMsXHJcbiAgICAgICAgICAgICAgICBkID0gX3RoaXMucGFyc2VkRGF0ZSxcclxuICAgICAgICAgICAgICAgIHNlbGVjdGVkRGF0ZXMgPSBfdGhpcy5zZWxlY3RlZERhdGVzLFxyXG4gICAgICAgICAgICAgICAgbGVuID0gc2VsZWN0ZWREYXRlcy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICBuZXdEYXRlID0gJyc7XHJcblxyXG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRlKSkge1xyXG4gICAgICAgICAgICAgICAgZGF0ZS5mb3JFYWNoKGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuc2VsZWN0RGF0ZShkKVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghKGRhdGUgaW5zdGFuY2VvZiBEYXRlKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5sYXN0U2VsZWN0ZWREYXRlID0gZGF0ZTtcclxuXHJcbiAgICAgICAgICAgIC8vIFNldCBuZXcgdGltZSB2YWx1ZXMgZnJvbSBEYXRlXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnRpbWVwaWNrZXIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGltZXBpY2tlci5fc2V0VGltZShkYXRlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gT24gdGhpcyBzdGVwIHRpbWVwaWNrZXIgd2lsbCBzZXQgdmFsaWQgdmFsdWVzIGluIGl0J3MgaW5zdGFuY2VcclxuICAgICAgICAgICAgX3RoaXMuX3RyaWdnZXIoJ3NlbGVjdERhdGUnLCBkYXRlKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFNldCBjb3JyZWN0IHRpbWUgdmFsdWVzIGFmdGVyIHRpbWVwaWNrZXIncyB2YWxpZGF0aW9uXHJcbiAgICAgICAgICAgIC8vIFByZXZlbnQgZnJvbSBzZXR0aW5nIGhvdXJzIG9yIG1pbnV0ZXMgd2hpY2ggdmFsdWVzIGFyZSBsZXNzZXIgdGhlbiBgbWluYCB2YWx1ZSBvclxyXG4gICAgICAgICAgICAvLyBncmVhdGVyIHRoZW4gYG1heGAgdmFsdWVcclxuICAgICAgICAgICAgaWYgKHRoaXMudGltZXBpY2tlcikge1xyXG4gICAgICAgICAgICAgICAgZGF0ZS5zZXRIb3Vycyh0aGlzLnRpbWVwaWNrZXIuaG91cnMpO1xyXG4gICAgICAgICAgICAgICAgZGF0ZS5zZXRNaW51dGVzKHRoaXMudGltZXBpY2tlci5taW51dGVzKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoX3RoaXMudmlldyA9PSAnZGF5cycpIHtcclxuICAgICAgICAgICAgICAgIGlmIChkYXRlLmdldE1vbnRoKCkgIT0gZC5tb250aCAmJiBvcHRzLm1vdmVUb090aGVyTW9udGhzT25TZWxlY3QpIHtcclxuICAgICAgICAgICAgICAgICAgICBuZXdEYXRlID0gbmV3IERhdGUoZGF0ZS5nZXRGdWxsWWVhcigpLCBkYXRlLmdldE1vbnRoKCksIDEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoX3RoaXMudmlldyA9PSAneWVhcnMnKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGF0ZS5nZXRGdWxsWWVhcigpICE9IGQueWVhciAmJiBvcHRzLm1vdmVUb090aGVyWWVhcnNPblNlbGVjdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld0RhdGUgPSBuZXcgRGF0ZShkYXRlLmdldEZ1bGxZZWFyKCksIDAsIDEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAob3B0cy5jYWxlbmRhcnMgPT09IDEgJiYgbmV3RGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuc2lsZW50ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIF90aGlzLmRhdGUgPSBuZXdEYXRlO1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuc2lsZW50ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy5uYXYuX3JlbmRlcigpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChvcHRzLm11bHRpcGxlRGF0ZXMgJiYgIW9wdHMucmFuZ2UpIHsgLy8gU2V0IHByaW9yaXR5IHRvIHJhbmdlIGZ1bmN0aW9uYWxpdHlcclxuICAgICAgICAgICAgICAgIGlmIChsZW4gPT09IG9wdHMubXVsdGlwbGVEYXRlcykgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFfdGhpcy5faXNTZWxlY3RlZChkYXRlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIF90aGlzLnNlbGVjdGVkRGF0ZXMucHVzaChkYXRlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIGlmIChvcHRzLnJhbmdlKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAobGVuID09IDIpIHtcclxuICAgICAgICAgICAgICAgICAgICBfdGhpcy5zZWxlY3RlZERhdGVzID0gW2RhdGVdO1xyXG4gICAgICAgICAgICAgICAgICAgIF90aGlzLm1pblJhbmdlID0gZGF0ZTtcclxuICAgICAgICAgICAgICAgICAgICBfdGhpcy5tYXhSYW5nZSA9ICcnO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsZW4gPT0gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIF90aGlzLnNlbGVjdGVkRGF0ZXMucHVzaChkYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIV90aGlzLm1heFJhbmdlKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMubWF4UmFuZ2UgPSBkYXRlO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLm1pblJhbmdlID0gZGF0ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gU3dhcCBkYXRlcyBpZiB0aGV5IHdlcmUgc2VsZWN0ZWQgdmlhIGRwLnNlbGVjdERhdGUoKSBhbmQgc2Vjb25kIGRhdGUgd2FzIHNtYWxsZXIgdGhlbiBmaXJzdFxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRlcGlja2VyLmJpZ2dlcihfdGhpcy5tYXhSYW5nZSwgX3RoaXMubWluUmFuZ2UpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLm1heFJhbmdlID0gX3RoaXMubWluUmFuZ2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLm1pblJhbmdlID0gZGF0ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuc2VsZWN0ZWREYXRlcyA9IFtfdGhpcy5taW5SYW5nZSwgX3RoaXMubWF4UmFuZ2VdXHJcblxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBfdGhpcy5zZWxlY3RlZERhdGVzID0gW2RhdGVdO1xyXG4gICAgICAgICAgICAgICAgICAgIF90aGlzLm1pblJhbmdlID0gZGF0ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIF90aGlzLnNlbGVjdGVkRGF0ZXMgPSBbZGF0ZV07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIF90aGlzLl9zZXRJbnB1dFZhbHVlKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAob3B0cy5vblNlbGVjdCkge1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuX3RyaWdnZXJPbkNoYW5nZSgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAob3B0cy5hdXRvQ2xvc2UgJiYgIXRoaXMudGltZXBpY2tlcklzQWN0aXZlKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIW9wdHMubXVsdGlwbGVEYXRlcyAmJiAhb3B0cy5yYW5nZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIF90aGlzLmhpZGUoKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAob3B0cy5yYW5nZSAmJiBfdGhpcy5zZWxlY3RlZERhdGVzLmxlbmd0aCA9PSAyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuaGlkZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLl9sb29wZXIoX3RoaXMudmlld3NbdGhpcy5jdXJyZW50Vmlld10sICdfcmVuZGVyJyk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgcmVtb3ZlRGF0ZTogZnVuY3Rpb24gKGRhdGUpIHtcclxuICAgICAgICAgICAgdmFyIHNlbGVjdGVkID0gdGhpcy5zZWxlY3RlZERhdGVzLFxyXG4gICAgICAgICAgICAgICAgX3RoaXMgPSB0aGlzO1xyXG5cclxuICAgICAgICAgICAgaWYgKCEoZGF0ZSBpbnN0YW5jZW9mIERhdGUpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gc2VsZWN0ZWQuc29tZShmdW5jdGlvbiAoY3VyRGF0ZSwgaSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGRhdGVwaWNrZXIuaXNTYW1lKGN1ckRhdGUsIGRhdGUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQuc3BsaWNlKGksIDEpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIV90aGlzLnNlbGVjdGVkRGF0ZXMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLm1pblJhbmdlID0gJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLm1heFJhbmdlID0gJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLmxhc3RTZWxlY3RlZERhdGUgPSAnJztcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5sYXN0U2VsZWN0ZWREYXRlID0gX3RoaXMuc2VsZWN0ZWREYXRlc1tfdGhpcy5zZWxlY3RlZERhdGVzLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMudmlld3NbX3RoaXMuY3VycmVudFZpZXddLl9yZW5kZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICBfdGhpcy5fc2V0SW5wdXRWYWx1ZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoX3RoaXMub3B0cy5vblNlbGVjdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5fdHJpZ2dlck9uQ2hhbmdlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHRvZGF5OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2lsZW50ID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy52aWV3ID0gdGhpcy5vcHRzLm1pblZpZXc7XHJcbiAgICAgICAgICAgIHRoaXMuc2lsZW50ID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuZGF0ZSA9IG5ldyBEYXRlKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRzLnRvZGF5QnV0dG9uIGluc3RhbmNlb2YgRGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3REYXRlKHRoaXMub3B0cy50b2RheUJ1dHRvbilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGNsZWFyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWREYXRlcyA9IFtdO1xyXG4gICAgICAgICAgICB0aGlzLm1pblJhbmdlID0gJyc7XHJcbiAgICAgICAgICAgIHRoaXMubWF4UmFuZ2UgPSAnJztcclxuICAgICAgICAgICAgdGhpcy52aWV3c1t0aGlzLmN1cnJlbnRWaWV3XS5fcmVuZGVyKCk7XHJcbiAgICAgICAgICAgIHRoaXMuX3NldElucHV0VmFsdWUoKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMub3B0cy5vblNlbGVjdCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fdHJpZ2dlck9uQ2hhbmdlKClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFVwZGF0ZXMgZGF0ZXBpY2tlciBvcHRpb25zXHJcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBwYXJhbSAtIHBhcmFtZXRlcidzIG5hbWUgdG8gdXBkYXRlLiBJZiBvYmplY3QgdGhlbiBpdCB3aWxsIGV4dGVuZCBjdXJyZW50IG9wdGlvbnNcclxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ8T2JqZWN0fSBbdmFsdWVdIC0gbmV3IHBhcmFtIHZhbHVlXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdXBkYXRlOiBmdW5jdGlvbiAocGFyYW0sIHZhbHVlKSB7XHJcbiAgICAgICAgICAgIHZhciBsZW4gPSBhcmd1bWVudHMubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgbGFzdFNlbGVjdGVkRGF0ZSA9IHRoaXMubGFzdFNlbGVjdGVkRGF0ZTtcclxuXHJcbiAgICAgICAgICAgIGlmIChsZW4gPT0gMikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vcHRzW3BhcmFtXSA9IHZhbHVlO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxlbiA9PSAxICYmIHR5cGVvZiBwYXJhbSA9PSAnb2JqZWN0Jykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vcHRzID0gJC5leHRlbmQodHJ1ZSwgdGhpcy5vcHRzLCBwYXJhbSlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5fY3JlYXRlU2hvcnRDdXRzKCk7XHJcbiAgICAgICAgICAgIHRoaXMuX3N5bmNXaXRoTWluTWF4RGF0ZXMoKTtcclxuICAgICAgICAgICAgdGhpcy5fZGVmaW5lTG9jYWxlKHRoaXMub3B0cy5sYW5ndWFnZSk7XHJcbiAgICAgICAgICAgIHRoaXMubmF2Ll9hZGRCdXR0b25zSWZOZWVkKCk7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5vcHRzLm9ubHlUaW1lcGlja2VyKSB0aGlzLm5hdi5fcmVuZGVyKCk7XHJcbiAgICAgICAgICAgIHRoaXMuX2xvb3Blcih0aGlzLnZpZXdzW3RoaXMuY3VycmVudFZpZXddLCAnX3JlbmRlcicpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuZWxJc0lucHV0ICYmICF0aGlzLm9wdHMuaW5saW5lKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9zZXRQb3NpdGlvbkNsYXNzZXModGhpcy5vcHRzLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnZpc2libGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFBvc2l0aW9uKHRoaXMub3B0cy5wb3NpdGlvbilcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMub3B0cy5jbGFzc2VzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRkYXRlcGlja2VyLmFkZENsYXNzKHRoaXMub3B0cy5jbGFzc2VzKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRzLm9ubHlUaW1lcGlja2VyKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRkYXRlcGlja2VyLmFkZENsYXNzKCctb25seS10aW1lcGlja2VyLScpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRzLmNhbGVuZGFycyA+IDEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGRhdGVwaWNrZXIuYWRkQ2xhc3MoJy1tdWx0aXBsZS1jYWxzLScpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRzLnRpbWVwaWNrZXIpIHtcclxuICAgICAgICAgICAgICAgIGlmIChsYXN0U2VsZWN0ZWREYXRlKSB0aGlzLnRpbWVwaWNrZXIuX2hhbmRsZURhdGUobGFzdFNlbGVjdGVkRGF0ZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVwaWNrZXIuX3VwZGF0ZVJhbmdlcygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy50aW1lcGlja2VyLl91cGRhdGVDdXJyZW50VGltZSgpO1xyXG4gICAgICAgICAgICAgICAgLy8gQ2hhbmdlIGhvdXJzIGFuZCBtaW51dGVzIGlmIGl0J3MgdmFsdWVzIGhhdmUgYmVlbiBjaGFuZ2VkIHRocm91Z2ggbWluL21heCBob3Vycy9taW51dGVzXHJcbiAgICAgICAgICAgICAgICBpZiAobGFzdFNlbGVjdGVkRGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxhc3RTZWxlY3RlZERhdGUuc2V0SG91cnModGhpcy50aW1lcGlja2VyLmhvdXJzKTtcclxuICAgICAgICAgICAgICAgICAgICBsYXN0U2VsZWN0ZWREYXRlLnNldE1pbnV0ZXModGhpcy50aW1lcGlja2VyLm1pbnV0ZXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLl9zZXRJbnB1dFZhbHVlKCk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfc3luY1dpdGhNaW5NYXhEYXRlczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2YXIgY3VyVGltZSA9IHRoaXMuZGF0ZS5nZXRUaW1lKCk7XHJcbiAgICAgICAgICAgIHRoaXMuc2lsZW50ID0gdHJ1ZTtcclxuICAgICAgICAgICAgaWYgKHRoaXMubWluVGltZSA+IGN1clRpbWUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZGF0ZSA9IHRoaXMubWluRGF0ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMubWF4VGltZSA8IGN1clRpbWUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZGF0ZSA9IHRoaXMubWF4RGF0ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLnNpbGVudCA9IGZhbHNlO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9pc1NlbGVjdGVkOiBmdW5jdGlvbiAoY2hlY2tEYXRlLCBjZWxsVHlwZSkge1xyXG4gICAgICAgICAgICB2YXIgcmVzID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWREYXRlcy5zb21lKGZ1bmN0aW9uIChkYXRlKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGF0ZXBpY2tlci5pc1NhbWUoZGF0ZSwgY2hlY2tEYXRlLCBjZWxsVHlwZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXMgPSBkYXRlO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlcztcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfc2V0SW5wdXRWYWx1ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2YXIgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgICAgICAgICAgb3B0cyA9IF90aGlzLm9wdHMsXHJcbiAgICAgICAgICAgICAgICBmb3JtYXQgPSBfdGhpcy5sb2MuZGF0ZUZvcm1hdCxcclxuICAgICAgICAgICAgICAgIGFsdEZvcm1hdCA9IG9wdHMuYWx0RmllbGREYXRlRm9ybWF0LFxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBfdGhpcy5zZWxlY3RlZERhdGVzLm1hcChmdW5jdGlvbiAoZGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfdGhpcy5mb3JtYXREYXRlKGZvcm1hdCwgZGF0ZSlcclxuICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgYWx0VmFsdWVzO1xyXG5cclxuICAgICAgICAgICAgaWYgKG9wdHMuYWx0RmllbGQgJiYgX3RoaXMuJGFsdEZpZWxkLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgYWx0VmFsdWVzID0gdGhpcy5zZWxlY3RlZERhdGVzLm1hcChmdW5jdGlvbiAoZGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfdGhpcy5mb3JtYXREYXRlKGFsdEZvcm1hdCwgZGF0ZSlcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgYWx0VmFsdWVzID0gYWx0VmFsdWVzLmpvaW4odGhpcy5vcHRzLm11bHRpcGxlRGF0ZXNTZXBhcmF0b3IpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kYWx0RmllbGQudmFsKGFsdFZhbHVlcyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuam9pbih0aGlzLm9wdHMubXVsdGlwbGVEYXRlc1NlcGFyYXRvcik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLiRlbC52YWwodmFsdWUpXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQ2hlY2sgaWYgZGF0ZSBpcyBiZXR3ZWVuIG1pbkRhdGUgYW5kIG1heERhdGVcclxuICAgICAgICAgKiBAcGFyYW0gZGF0ZSB7b2JqZWN0fSAtIGRhdGUgb2JqZWN0XHJcbiAgICAgICAgICogQHBhcmFtIHR5cGUge3N0cmluZ30gLSBjZWxsIHR5cGVcclxuICAgICAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cclxuICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIF9pc0luUmFuZ2U6IGZ1bmN0aW9uIChkYXRlLCB0eXBlKSB7XHJcbiAgICAgICAgICAgIHZhciB0aW1lID0gZGF0ZS5nZXRUaW1lKCksXHJcbiAgICAgICAgICAgICAgICBkID0gZGF0ZXBpY2tlci5nZXRQYXJzZWREYXRlKGRhdGUpLFxyXG4gICAgICAgICAgICAgICAgbWluID0gZGF0ZXBpY2tlci5nZXRQYXJzZWREYXRlKHRoaXMubWluRGF0ZSksXHJcbiAgICAgICAgICAgICAgICBtYXggPSBkYXRlcGlja2VyLmdldFBhcnNlZERhdGUodGhpcy5tYXhEYXRlKSxcclxuICAgICAgICAgICAgICAgIGRNaW5UaW1lID0gbmV3IERhdGUoZC55ZWFyLCBkLm1vbnRoLCBtaW4uZGF0ZSkuZ2V0VGltZSgpLFxyXG4gICAgICAgICAgICAgICAgZE1heFRpbWUgPSBuZXcgRGF0ZShkLnllYXIsIGQubW9udGgsIG1heC5kYXRlKS5nZXRUaW1lKCksXHJcbiAgICAgICAgICAgICAgICB0eXBlcyA9IHtcclxuICAgICAgICAgICAgICAgICAgICBkYXk6IHRpbWUgPj0gdGhpcy5taW5UaW1lICYmIHRpbWUgPD0gdGhpcy5tYXhUaW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIG1vbnRoOiBkTWluVGltZSA+PSB0aGlzLm1pblRpbWUgJiYgZE1heFRpbWUgPD0gdGhpcy5tYXhUaW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIHllYXI6IGQueWVhciA+PSBtaW4ueWVhciAmJiBkLnllYXIgPD0gbWF4LnllYXJcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHJldHVybiB0eXBlID8gdHlwZXNbdHlwZV0gOiB0eXBlcy5kYXlcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfZ2V0RGltZW5zaW9uczogZnVuY3Rpb24gKCRlbCkge1xyXG4gICAgICAgICAgICB2YXIgb2Zmc2V0ID0gJGVsLm9mZnNldCgpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHdpZHRoOiAkZWwub3V0ZXJXaWR0aCgpLFxyXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiAkZWwub3V0ZXJIZWlnaHQoKSxcclxuICAgICAgICAgICAgICAgIGxlZnQ6IG9mZnNldC5sZWZ0LFxyXG4gICAgICAgICAgICAgICAgdG9wOiBvZmZzZXQudG9wXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfZ2V0RGF0ZUZyb21DZWxsOiBmdW5jdGlvbiAoY2VsbCkge1xyXG4gICAgICAgICAgICB2YXIgY3VyRGF0ZSA9IHRoaXMucGFyc2VkRGF0ZSxcclxuICAgICAgICAgICAgICAgIHllYXIgPSBjZWxsLmRhdGEoJ3llYXInKSB8fCBjdXJEYXRlLnllYXIsXHJcbiAgICAgICAgICAgICAgICBtb250aCA9IGNlbGwuZGF0YSgnbW9udGgnKSA9PSB1bmRlZmluZWQgPyBjdXJEYXRlLm1vbnRoIDogY2VsbC5kYXRhKCdtb250aCcpLFxyXG4gICAgICAgICAgICAgICAgZGF0ZSA9IGNlbGwuZGF0YSgnZGF0ZScpIHx8IDE7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IERhdGUoeWVhciwgbW9udGgsIGRhdGUpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9zZXRQb3NpdGlvbkNsYXNzZXM6IGZ1bmN0aW9uIChwb3MpIHtcclxuICAgICAgICAgICAgcG9zID0gcG9zLnNwbGl0KCcgJyk7XHJcbiAgICAgICAgICAgIHZhciBtYWluID0gcG9zWzBdLFxyXG4gICAgICAgICAgICAgICAgc2VjID0gcG9zWzFdLFxyXG4gICAgICAgICAgICAgICAgY2xhc3NlcyA9ICdkYXRlcGlja2VyIC0nICsgbWFpbiArICctJyArIHNlYyArICctIC1mcm9tLScgKyBtYWluICsgJy0nO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMudmlzaWJsZSkgY2xhc3NlcyArPSAnIGFjdGl2ZSc7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdHMuY2FsZW5kYXJzID4gMSkgY2xhc3NlcyArPSAnIC1tdWx0aXBsZS1jYWxzLSc7XHJcblxyXG4gICAgICAgICAgICB0aGlzLiRkYXRlcGlja2VyXHJcbiAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignY2xhc3MnKVxyXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKGNsYXNzZXMpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHNldFBvc2l0aW9uOiBmdW5jdGlvbiAocG9zaXRpb24pIHtcclxuICAgICAgICAgICAgcG9zaXRpb24gPSBwb3NpdGlvbiB8fCB0aGlzLm9wdHMucG9zaXRpb247XHJcblxyXG4gICAgICAgICAgICB2YXIgZGltcyA9IHRoaXMuX2dldERpbWVuc2lvbnModGhpcy4kZWwpLFxyXG4gICAgICAgICAgICAgICAgc2VsZkRpbXMgPSB0aGlzLl9nZXREaW1lbnNpb25zKHRoaXMuJGRhdGVwaWNrZXIpLFxyXG4gICAgICAgICAgICAgICAgcG9zID0gcG9zaXRpb24uc3BsaXQoJyAnKSxcclxuICAgICAgICAgICAgICAgIHRvcCwgbGVmdCxcclxuICAgICAgICAgICAgICAgIG9mZnNldCA9IHRoaXMub3B0cy5vZmZzZXQsXHJcbiAgICAgICAgICAgICAgICBtYWluID0gcG9zWzBdLFxyXG4gICAgICAgICAgICAgICAgc2Vjb25kYXJ5ID0gcG9zWzFdO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoIChtYWluKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlICd0b3AnOlxyXG4gICAgICAgICAgICAgICAgICAgIHRvcCA9IGRpbXMudG9wIC0gc2VsZkRpbXMuaGVpZ2h0IC0gb2Zmc2V0O1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAncmlnaHQnOlxyXG4gICAgICAgICAgICAgICAgICAgIGxlZnQgPSBkaW1zLmxlZnQgKyBkaW1zLndpZHRoICsgb2Zmc2V0O1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnYm90dG9tJzpcclxuICAgICAgICAgICAgICAgICAgICB0b3AgPSBkaW1zLnRvcCArIGRpbXMuaGVpZ2h0ICsgb2Zmc2V0O1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnbGVmdCc6XHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdCA9IGRpbXMubGVmdCAtIHNlbGZEaW1zLndpZHRoIC0gb2Zmc2V0O1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2goc2Vjb25kYXJ5KSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlICd0b3AnOlxyXG4gICAgICAgICAgICAgICAgICAgIHRvcCA9IGRpbXMudG9wO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAncmlnaHQnOlxyXG4gICAgICAgICAgICAgICAgICAgIGxlZnQgPSBkaW1zLmxlZnQgKyBkaW1zLndpZHRoIC0gc2VsZkRpbXMud2lkdGg7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdib3R0b20nOlxyXG4gICAgICAgICAgICAgICAgICAgIHRvcCA9IGRpbXMudG9wICsgZGltcy5oZWlnaHQgLSBzZWxmRGltcy5oZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdsZWZ0JzpcclxuICAgICAgICAgICAgICAgICAgICBsZWZ0ID0gZGltcy5sZWZ0O1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnY2VudGVyJzpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoL2xlZnR8cmlnaHQvLnRlc3QobWFpbikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG9wID0gZGltcy50b3AgKyBkaW1zLmhlaWdodC8yIC0gc2VsZkRpbXMuaGVpZ2h0LzI7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGVmdCA9IGRpbXMubGVmdCArIGRpbXMud2lkdGgvMiAtIHNlbGZEaW1zLndpZHRoLzI7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLiRkYXRlcGlja2VyXHJcbiAgICAgICAgICAgICAgICAuY3NzKHtcclxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiBsZWZ0LFxyXG4gICAgICAgICAgICAgICAgICAgIHRvcDogdG9wXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHNob3c6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIG9uU2hvdyA9IHRoaXMub3B0cy5vblNob3c7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNldFBvc2l0aW9uKHRoaXMub3B0cy5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMuJGRhdGVwaWNrZXIuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xyXG4gICAgICAgICAgICB0aGlzLnZpc2libGUgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgaWYgKG9uU2hvdykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fYmluZFZpc2lvbkV2ZW50cyhvblNob3cpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBoaWRlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHZhciBvbkhpZGUgPSB0aGlzLm9wdHMub25IaWRlO1xyXG5cclxuICAgICAgICAgICAgdGhpcy4kZGF0ZXBpY2tlclxyXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdhY3RpdmUnKVxyXG4gICAgICAgICAgICAgICAgLmNzcyh7XHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogJy0xMDAwMDBweCdcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5mb2N1c2VkID0gJyc7XHJcbiAgICAgICAgICAgIHRoaXMua2V5cyA9IFtdO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5pbkZvY3VzID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLiRlbC5ibHVyKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAob25IaWRlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9iaW5kVmlzaW9uRXZlbnRzKG9uSGlkZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGRvd246IGZ1bmN0aW9uIChkYXRlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2NoYW5nZVZpZXcoZGF0ZSwgJ2Rvd24nKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICB1cDogZnVuY3Rpb24gKGRhdGUpIHtcclxuICAgICAgICAgICAgdGhpcy5fY2hhbmdlVmlldyhkYXRlLCAndXAnKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfYmluZFZpc2lvbkV2ZW50czogZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGRhdGVwaWNrZXIub2ZmKCd0cmFuc2l0aW9uZW5kLmRwJyk7XHJcbiAgICAgICAgICAgIGV2ZW50KHRoaXMsIGZhbHNlKTtcclxuICAgICAgICAgICAgdGhpcy4kZGF0ZXBpY2tlci5vbmUoJ3RyYW5zaXRpb25lbmQuZHAnLCBldmVudC5iaW5kKHRoaXMsIHRoaXMsIHRydWUpKVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9jaGFuZ2VWaWV3OiBmdW5jdGlvbiAoZGF0ZSwgZGlyKSB7XHJcbiAgICAgICAgICAgIGRhdGUgPSBkYXRlIHx8IHRoaXMuZm9jdXNlZCB8fCB0aGlzLmRhdGU7XHJcblxyXG4gICAgICAgICAgICB2YXIgbmV4dFZpZXcgPSBkaXIgPT0gJ3VwJyA/IHRoaXMudmlld0luZGV4ICsgMSA6IHRoaXMudmlld0luZGV4IC0gMTtcclxuICAgICAgICAgICAgaWYgKG5leHRWaWV3ID4gMikgbmV4dFZpZXcgPSAyO1xyXG4gICAgICAgICAgICBpZiAobmV4dFZpZXcgPCAwKSBuZXh0VmlldyA9IDA7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNpbGVudCA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuZGF0ZSA9IG5ldyBEYXRlKGRhdGUuZ2V0RnVsbFllYXIoKSwgZGF0ZS5nZXRNb250aCgpLCAxKTtcclxuICAgICAgICAgICAgdGhpcy5zaWxlbnQgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy52aWV3ID0gdGhpcy52aWV3SW5kZXhlc1tuZXh0Vmlld107XHJcblxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9oYW5kbGVIb3RLZXk6IGZ1bmN0aW9uIChrZXkpIHtcclxuICAgICAgICAgICAgdmFyIGRhdGUgPSBkYXRlcGlja2VyLmdldFBhcnNlZERhdGUodGhpcy5fZ2V0Rm9jdXNlZERhdGUoKSksXHJcbiAgICAgICAgICAgICAgICBmb2N1c2VkUGFyc2VkLFxyXG4gICAgICAgICAgICAgICAgbyA9IHRoaXMub3B0cyxcclxuICAgICAgICAgICAgICAgIG5ld0RhdGUsXHJcbiAgICAgICAgICAgICAgICB0b3RhbERheXNJbk5leHRNb250aCxcclxuICAgICAgICAgICAgICAgIG1vbnRoQ2hhbmdlZCA9IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgeWVhckNoYW5nZWQgPSBmYWxzZSxcclxuICAgICAgICAgICAgICAgIGRlY2FkZUNoYW5nZWQgPSBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHkgPSBkYXRlLnllYXIsXHJcbiAgICAgICAgICAgICAgICBtID0gZGF0ZS5tb250aCxcclxuICAgICAgICAgICAgICAgIGQgPSBkYXRlLmRhdGU7XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKGtleSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnY3RybFJpZ2h0JzpcclxuICAgICAgICAgICAgICAgIGNhc2UgJ2N0cmxVcCc6XHJcbiAgICAgICAgICAgICAgICAgICAgbSArPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgIG1vbnRoQ2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdjdHJsTGVmdCc6XHJcbiAgICAgICAgICAgICAgICBjYXNlICdjdHJsRG93bic6XHJcbiAgICAgICAgICAgICAgICAgICAgbSAtPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgIG1vbnRoQ2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdzaGlmdFJpZ2h0JzpcclxuICAgICAgICAgICAgICAgIGNhc2UgJ3NoaWZ0VXAnOlxyXG4gICAgICAgICAgICAgICAgICAgIHllYXJDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB5ICs9IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdzaGlmdExlZnQnOlxyXG4gICAgICAgICAgICAgICAgY2FzZSAnc2hpZnREb3duJzpcclxuICAgICAgICAgICAgICAgICAgICB5ZWFyQ2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgeSAtPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnYWx0UmlnaHQnOlxyXG4gICAgICAgICAgICAgICAgY2FzZSAnYWx0VXAnOlxyXG4gICAgICAgICAgICAgICAgICAgIGRlY2FkZUNoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHkgKz0gMTA7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdhbHRMZWZ0JzpcclxuICAgICAgICAgICAgICAgIGNhc2UgJ2FsdERvd24nOlxyXG4gICAgICAgICAgICAgICAgICAgIGRlY2FkZUNoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHkgLT0gMTA7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdjdHJsU2hpZnRVcCc6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0b3RhbERheXNJbk5leHRNb250aCA9IGRhdGVwaWNrZXIuZ2V0RGF5c0NvdW50KG5ldyBEYXRlKHksbSkpO1xyXG4gICAgICAgICAgICBuZXdEYXRlID0gbmV3IERhdGUoeSxtLGQpO1xyXG5cclxuICAgICAgICAgICAgLy8gSWYgbmV4dCBtb250aCBoYXMgbGVzcyBkYXlzIHRoYW4gY3VycmVudCwgc2V0IGRhdGUgdG8gdG90YWwgZGF5cyBpbiB0aGF0IG1vbnRoXHJcbiAgICAgICAgICAgIGlmICh0b3RhbERheXNJbk5leHRNb250aCA8IGQpIGQgPSB0b3RhbERheXNJbk5leHRNb250aDtcclxuXHJcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIG5ld0RhdGUgaXMgaW4gdmFsaWQgcmFuZ2VcclxuICAgICAgICAgICAgaWYgKG5ld0RhdGUuZ2V0VGltZSgpIDwgdGhpcy5taW5UaW1lKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdEYXRlID0gdGhpcy5taW5EYXRlO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKG5ld0RhdGUuZ2V0VGltZSgpID4gdGhpcy5tYXhUaW1lKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdEYXRlID0gdGhpcy5tYXhEYXRlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmZvY3VzZWQgPSBuZXdEYXRlO1xyXG5cclxuICAgICAgICAgICAgZm9jdXNlZFBhcnNlZCA9IGRhdGVwaWNrZXIuZ2V0UGFyc2VkRGF0ZShuZXdEYXRlKTtcclxuICAgICAgICAgICAgaWYgKG1vbnRoQ2hhbmdlZCAmJiBvLm9uQ2hhbmdlTW9udGgpIHtcclxuICAgICAgICAgICAgICAgIG8ub25DaGFuZ2VNb250aChmb2N1c2VkUGFyc2VkLm1vbnRoLCBmb2N1c2VkUGFyc2VkLnllYXIpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHllYXJDaGFuZ2VkICYmIG8ub25DaGFuZ2VZZWFyKSB7XHJcbiAgICAgICAgICAgICAgICBvLm9uQ2hhbmdlWWVhcihmb2N1c2VkUGFyc2VkLnllYXIpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGRlY2FkZUNoYW5nZWQgJiYgby5vbkNoYW5nZURlY2FkZSkge1xyXG4gICAgICAgICAgICAgICAgby5vbkNoYW5nZURlY2FkZSh0aGlzLmN1ckRlY2FkZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9yZWdpc3RlcktleTogZnVuY3Rpb24gKGtleSkge1xyXG4gICAgICAgICAgICB2YXIgZXhpc3RzID0gdGhpcy5rZXlzLnNvbWUoZnVuY3Rpb24gKGN1cktleSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGN1cktleSA9PSBrZXk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFleGlzdHMpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMua2V5cy5wdXNoKGtleSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF91blJlZ2lzdGVyS2V5OiBmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICAgICAgICAgIHZhciBpbmRleCA9IHRoaXMua2V5cy5pbmRleE9mKGtleSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmtleXMuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfaXNIb3RLZXlQcmVzc2VkOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHZhciBjdXJyZW50SG90S2V5LFxyXG4gICAgICAgICAgICAgICAgZm91bmQgPSBmYWxzZSxcclxuICAgICAgICAgICAgICAgIF90aGlzID0gdGhpcyxcclxuICAgICAgICAgICAgICAgIHByZXNzZWRLZXlzID0gdGhpcy5rZXlzLnNvcnQoKTtcclxuXHJcbiAgICAgICAgICAgIGZvciAodmFyIGhvdEtleSBpbiBob3RLZXlzKSB7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50SG90S2V5ID0gaG90S2V5c1tob3RLZXldO1xyXG4gICAgICAgICAgICAgICAgaWYgKHByZXNzZWRLZXlzLmxlbmd0aCAhPSBjdXJyZW50SG90S2V5Lmxlbmd0aCkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRIb3RLZXkuZXZlcnkoZnVuY3Rpb24gKGtleSwgaSkgeyByZXR1cm4ga2V5ID09IHByZXNzZWRLZXlzW2ldfSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBfdGhpcy5fdHJpZ2dlcignaG90S2V5JywgaG90S2V5KTtcclxuICAgICAgICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBmb3VuZDtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfdHJpZ2dlcjogZnVuY3Rpb24gKGV2ZW50LCBhcmdzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGVsLnRyaWdnZXIoZXZlbnQsIGFyZ3MpXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2ZvY3VzTmV4dENlbGw6IGZ1bmN0aW9uIChrZXlDb2RlLCB0eXBlKSB7XHJcbiAgICAgICAgICAgIHR5cGUgPSB0eXBlIHx8IHRoaXMuY2VsbFR5cGU7XHJcblxyXG4gICAgICAgICAgICB2YXIgZGF0ZSA9IGRhdGVwaWNrZXIuZ2V0UGFyc2VkRGF0ZSh0aGlzLl9nZXRGb2N1c2VkRGF0ZSgpKSxcclxuICAgICAgICAgICAgICAgIHkgPSBkYXRlLnllYXIsXHJcbiAgICAgICAgICAgICAgICBtID0gZGF0ZS5tb250aCxcclxuICAgICAgICAgICAgICAgIGQgPSBkYXRlLmRhdGU7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5faXNIb3RLZXlQcmVzc2VkKCkpe1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2goa2V5Q29kZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAzNzogLy8gbGVmdFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPT0gJ2RheScgPyAoZCAtPSAxKSA6ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPT0gJ21vbnRoJyA/IChtIC09IDEpIDogJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9PSAneWVhcicgPyAoeSAtPSAxKSA6ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAzODogLy8gdXBcclxuICAgICAgICAgICAgICAgICAgICB0eXBlID09ICdkYXknID8gKGQgLT0gNykgOiAnJztcclxuICAgICAgICAgICAgICAgICAgICB0eXBlID09ICdtb250aCcgPyAobSAtPSAzKSA6ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPT0gJ3llYXInID8gKHkgLT0gNCkgOiAnJztcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMzk6IC8vIHJpZ2h0XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9PSAnZGF5JyA/IChkICs9IDEpIDogJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9PSAnbW9udGgnID8gKG0gKz0gMSkgOiAnJztcclxuICAgICAgICAgICAgICAgICAgICB0eXBlID09ICd5ZWFyJyA/ICh5ICs9IDEpIDogJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDQwOiAvLyBkb3duXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9PSAnZGF5JyA/IChkICs9IDcpIDogJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9PSAnbW9udGgnID8gKG0gKz0gMykgOiAnJztcclxuICAgICAgICAgICAgICAgICAgICB0eXBlID09ICd5ZWFyJyA/ICh5ICs9IDQpIDogJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBuZCA9IG5ldyBEYXRlKHksbSxkKTtcclxuICAgICAgICAgICAgaWYgKG5kLmdldFRpbWUoKSA8IHRoaXMubWluVGltZSkge1xyXG4gICAgICAgICAgICAgICAgbmQgPSB0aGlzLm1pbkRhdGU7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobmQuZ2V0VGltZSgpID4gdGhpcy5tYXhUaW1lKSB7XHJcbiAgICAgICAgICAgICAgICBuZCA9IHRoaXMubWF4RGF0ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5mb2N1c2VkID0gbmQ7XHJcblxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9nZXRGb2N1c2VkRGF0ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2YXIgZm9jdXNlZCAgPSB0aGlzLmZvY3VzZWQgfHwgdGhpcy5zZWxlY3RlZERhdGVzW3RoaXMuc2VsZWN0ZWREYXRlcy5sZW5ndGggLSAxXSxcclxuICAgICAgICAgICAgICAgIGQgPSB0aGlzLnBhcnNlZERhdGU7XHJcblxyXG4gICAgICAgICAgICBpZiAoIWZvY3VzZWQpIHtcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAodGhpcy52aWV3KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZGF5cyc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvY3VzZWQgPSBuZXcgRGF0ZShkLnllYXIsIGQubW9udGgsIG5ldyBEYXRlKCkuZ2V0RGF0ZSgpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbW9udGhzJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9jdXNlZCA9IG5ldyBEYXRlKGQueWVhciwgZC5tb250aCwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3llYXJzJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9jdXNlZCA9IG5ldyBEYXRlKGQueWVhciwgMCwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZm9jdXNlZDtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfZ2V0Q2VsbDogZnVuY3Rpb24gKGRhdGUsIHR5cGUpIHtcclxuICAgICAgICAgICAgdHlwZSA9IHR5cGUgfHwgdGhpcy5jZWxsVHlwZTtcclxuXHJcbiAgICAgICAgICAgIHZhciBkID0gZGF0ZXBpY2tlci5nZXRQYXJzZWREYXRlKGRhdGUpLFxyXG4gICAgICAgICAgICAgICAgc2VsZWN0b3IgPSAnLmRhdGVwaWNrZXItLWNlbGxbZGF0YS15ZWFyPVwiJyArIGQueWVhciArICdcIl0nLFxyXG4gICAgICAgICAgICAgICAgJGNlbGw7XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgJ21vbnRoJzpcclxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RvciA9ICdbZGF0YS1tb250aD1cIicgKyBkLm1vbnRoICsgJ1wiXSc7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdkYXknOlxyXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yICs9ICdbZGF0YS1tb250aD1cIicgKyBkLm1vbnRoICsgJ1wiXVtkYXRhLWRhdGU9XCInICsgZC5kYXRlICsgJ1wiXSc7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgJGNlbGwgPSB0aGlzLiRlbC5maW5kKHNlbGVjdG9yKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiAkY2VsbC5sZW5ndGggPyAkY2VsbCA6ICQoJycpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGRlc3Ryb3k6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICAgICAgX3RoaXMuJGVsXHJcbiAgICAgICAgICAgICAgICAub2ZmKCcuYWRwJylcclxuICAgICAgICAgICAgICAgIC5kYXRhKCdkYXRlcGlja2VyJywgJycpO1xyXG5cclxuICAgICAgICAgICAgX3RoaXMuc2VsZWN0ZWREYXRlcyA9IFtdO1xyXG4gICAgICAgICAgICBfdGhpcy5mb2N1c2VkID0gJyc7XHJcbiAgICAgICAgICAgIF90aGlzLnZpZXdzID0ge307XHJcbiAgICAgICAgICAgIF90aGlzLmtleXMgPSBbXTtcclxuICAgICAgICAgICAgX3RoaXMubWluUmFuZ2UgPSAnJztcclxuICAgICAgICAgICAgX3RoaXMubWF4UmFuZ2UgPSAnJztcclxuXHJcbiAgICAgICAgICAgIGlmIChfdGhpcy5vcHRzLmlubGluZSB8fCAhX3RoaXMuZWxJc0lucHV0KSB7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy4kZGF0ZXBpY2tlci5jbG9zZXN0KCcuZGF0ZXBpY2tlci1pbmxpbmUnKS5yZW1vdmUoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIF90aGlzLiRkYXRlcGlja2VyLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2hhbmRsZUFscmVhZHlTZWxlY3RlZERhdGVzOiBmdW5jdGlvbiAoYWxyZWFkeVNlbGVjdGVkLCBzZWxlY3RlZERhdGUpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMub3B0cy5yYW5nZSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLm9wdHMudG9nZ2xlU2VsZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgcG9zc2liaWxpdHkgdG8gc2VsZWN0IHNhbWUgZGF0ZSB3aGVuIHJhbmdlIGlzIHRydWVcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5zZWxlY3RlZERhdGVzLmxlbmd0aCAhPSAyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3RyaWdnZXIoJ2NsaWNrQ2VsbCcsIHNlbGVjdGVkRGF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZURhdGUoc2VsZWN0ZWREYXRlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLm9wdHMudG9nZ2xlU2VsZWN0ZWQpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVEYXRlKHNlbGVjdGVkRGF0ZSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIENoYW5nZSBsYXN0IHNlbGVjdGVkIGRhdGUgdG8gYmUgYWJsZSB0byBjaGFuZ2UgdGltZSB3aGVuIGNsaWNraW5nIG9uIHRoaXMgY2VsbFxyXG4gICAgICAgICAgICBpZiAoIXRoaXMub3B0cy50b2dnbGVTZWxlY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sYXN0U2VsZWN0ZWREYXRlID0gYWxyZWFkeVNlbGVjdGVkO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub3B0cy50aW1lcGlja2VyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcGlja2VyLl9zZXRUaW1lKGFscmVhZHlTZWxlY3RlZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcGlja2VyLnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX29uU2hvd0V2ZW50OiBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMudmlzaWJsZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zaG93KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfb25CbHVyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5pbkZvY3VzICYmIHRoaXMudmlzaWJsZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfb25Nb3VzZURvd25EYXRlcGlja2VyOiBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICB0aGlzLmluRm9jdXMgPSB0cnVlO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9vbk1vdXNlVXBEYXRlcGlja2VyOiBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICB0aGlzLmluRm9jdXMgPSBmYWxzZTtcclxuICAgICAgICAgICAgZS5vcmlnaW5hbEV2ZW50LmluRm9jdXMgPSB0cnVlO1xyXG4gICAgICAgICAgICBpZiAoIWUub3JpZ2luYWxFdmVudC50aW1lcGlja2VyRm9jdXMpIHRoaXMuJGVsLmZvY3VzKCk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX29uS2V5VXBHZW5lcmFsOiBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICB2YXIgdmFsID0gdGhpcy4kZWwudmFsKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXZhbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhcigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX29uUmVzaXplOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnZpc2libGUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0UG9zaXRpb24oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9vbk1vdXNlVXBCb2R5OiBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICBpZiAoZS5vcmlnaW5hbEV2ZW50LmluRm9jdXMpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnZpc2libGUgJiYgIXRoaXMuaW5Gb2N1cykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfb25Nb3VzZVVwRWw6IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgIGUub3JpZ2luYWxFdmVudC5pbkZvY3VzID0gdHJ1ZTtcclxuICAgICAgICAgICAgc2V0VGltZW91dCh0aGlzLl9vbktleVVwR2VuZXJhbC5iaW5kKHRoaXMpLDQpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9vbktleURvd246IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgIHZhciBjb2RlID0gZS53aGljaDtcclxuICAgICAgICAgICAgdGhpcy5fcmVnaXN0ZXJLZXkoY29kZSk7XHJcblxyXG4gICAgICAgICAgICAvLyBBcnJvd3NcclxuICAgICAgICAgICAgaWYgKGNvZGUgPj0gMzcgJiYgY29kZSA8PSA0MCkge1xyXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fZm9jdXNOZXh0Q2VsbChjb2RlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gRW50ZXJcclxuICAgICAgICAgICAgaWYgKGNvZGUgPT0gMTMpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZvY3VzZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5fZ2V0Q2VsbCh0aGlzLmZvY3VzZWQpLmhhc0NsYXNzKCctZGlzYWJsZWQtJykpIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy52aWV3ICE9IHRoaXMub3B0cy5taW5WaWV3KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZG93bigpXHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFscmVhZHlTZWxlY3RlZCA9IHRoaXMuX2lzU2VsZWN0ZWQodGhpcy5mb2N1c2VkLCB0aGlzLmNlbGxUeXBlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghYWxyZWFkeVNlbGVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lcGlja2VyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5mb2N1c2VkLnNldEhvdXJzKHRoaXMudGltZXBpY2tlci5ob3Vycyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5mb2N1c2VkLnNldE1pbnV0ZXModGhpcy50aW1lcGlja2VyLm1pbnV0ZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3REYXRlKHRoaXMuZm9jdXNlZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlQWxyZWFkeVNlbGVjdGVkRGF0ZXMoYWxyZWFkeVNlbGVjdGVkLCB0aGlzLmZvY3VzZWQpXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBFc2NcclxuICAgICAgICAgICAgaWYgKGNvZGUgPT0gMjcpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGlkZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX29uS2V5VXA6IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgIHZhciBjb2RlID0gZS53aGljaDtcclxuICAgICAgICAgICAgdGhpcy5fdW5SZWdpc3RlcktleShjb2RlKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfb25Ib3RLZXk6IGZ1bmN0aW9uIChlLCBob3RLZXkpIHtcclxuICAgICAgICAgICAgdGhpcy5faGFuZGxlSG90S2V5KGhvdEtleSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX29uTW91c2VFbnRlckNlbGw6IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgIHZhciAkY2VsbCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJy5kYXRlcGlja2VyLS1jZWxsJyksXHJcbiAgICAgICAgICAgICAgICBkYXRlID0gdGhpcy5fZ2V0RGF0ZUZyb21DZWxsKCRjZWxsKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFByZXZlbnQgZnJvbSB1bm5lY2Vzc2FyeSByZW5kZXJpbmcgYW5kIHNldHRpbmcgbmV3IGN1cnJlbnREYXRlXHJcbiAgICAgICAgICAgIHRoaXMuc2lsZW50ID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmZvY3VzZWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZm9jdXNlZCA9ICcnXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICRjZWxsLmFkZENsYXNzKCctZm9jdXMtJyk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmZvY3VzZWQgPSBkYXRlO1xyXG4gICAgICAgICAgICB0aGlzLnNpbGVudCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMub3B0cy5yYW5nZSAmJiB0aGlzLnNlbGVjdGVkRGF0ZXMubGVuZ3RoID09IDEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWluUmFuZ2UgPSB0aGlzLnNlbGVjdGVkRGF0ZXNbMF07XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1heFJhbmdlID0gJyc7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGF0ZXBpY2tlci5sZXNzKHRoaXMubWluUmFuZ2UsIHRoaXMuZm9jdXNlZCkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1heFJhbmdlID0gdGhpcy5taW5SYW5nZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1pblJhbmdlID0gJyc7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9sb29wZXIodGhpcy52aWV3c1t0aGlzLmN1cnJlbnRWaWV3XSwgJ191cGRhdGUnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9vbk1vdXNlTGVhdmVDZWxsOiBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICB2YXIgJGNlbGwgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCcuZGF0ZXBpY2tlci0tY2VsbCcpO1xyXG5cclxuICAgICAgICAgICAgJGNlbGwucmVtb3ZlQ2xhc3MoJy1mb2N1cy0nKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2lsZW50ID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5mb2N1c2VkID0gJyc7XHJcbiAgICAgICAgICAgIHRoaXMuc2lsZW50ID0gZmFsc2U7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX29uVGltZUNoYW5nZTogZnVuY3Rpb24gKGUsIGgsIG0pIHtcclxuICAgICAgICAgICAgdmFyIGRhdGUgPSBuZXcgRGF0ZSgpLFxyXG4gICAgICAgICAgICAgICAgc2VsZWN0ZWREYXRlcyA9IHRoaXMuc2VsZWN0ZWREYXRlcyxcclxuICAgICAgICAgICAgICAgIHNlbGVjdGVkID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICBpZiAoc2VsZWN0ZWREYXRlcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgIHNlbGVjdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGRhdGUgPSB0aGlzLmxhc3RTZWxlY3RlZERhdGU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGRhdGUuc2V0SG91cnMoaCk7XHJcbiAgICAgICAgICAgIGRhdGUuc2V0TWludXRlcyhtKTtcclxuXHJcbiAgICAgICAgICAgIGlmICghc2VsZWN0ZWQgJiYgIXRoaXMuX2dldENlbGwoZGF0ZSkuaGFzQ2xhc3MoJy1kaXNhYmxlZC0nKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3REYXRlKGRhdGUpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fc2V0SW5wdXRWYWx1ZSgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub3B0cy5vblNlbGVjdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3RyaWdnZXJPbkNoYW5nZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX29uQ2xpY2tDZWxsOiBmdW5jdGlvbiAoZSwgZGF0ZSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy50aW1lcGlja2VyKSB7XHJcbiAgICAgICAgICAgICAgICBkYXRlLnNldEhvdXJzKHRoaXMudGltZXBpY2tlci5ob3Vycyk7XHJcbiAgICAgICAgICAgICAgICBkYXRlLnNldE1pbnV0ZXModGhpcy50aW1lcGlja2VyLm1pbnV0ZXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0RGF0ZShkYXRlKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfbG9vcGVyOiBmdW5jdGlvbiAoYXJyLCBtZXRob2QpIHtcclxuICAgICAgICAgICBhcnIuZm9yRWFjaChmdW5jdGlvbiAoZWwpIHtcclxuICAgICAgICAgICAgICAgZWxbbWV0aG9kXSgpO1xyXG4gICAgICAgICAgIH0pXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgc2V0IGZvY3VzZWQodmFsKSB7XHJcbiAgICAgICAgICAgIGlmICghdmFsICYmIHRoaXMuZm9jdXNlZCkge1xyXG4gICAgICAgICAgICAgICAgdmFyICRjZWxsID0gdGhpcy5fZ2V0Q2VsbCh0aGlzLmZvY3VzZWQpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICgkY2VsbC5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAkY2VsbC5yZW1vdmVDbGFzcygnLWZvY3VzLScpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5fZm9jdXNlZCA9IHZhbDtcclxuICAgICAgICAgICAgaWYgKHRoaXMub3B0cy5yYW5nZSAmJiB0aGlzLnNlbGVjdGVkRGF0ZXMubGVuZ3RoID09IDEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWluUmFuZ2UgPSB0aGlzLnNlbGVjdGVkRGF0ZXNbMF07XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1heFJhbmdlID0gJyc7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGF0ZXBpY2tlci5sZXNzKHRoaXMubWluUmFuZ2UsIHRoaXMuX2ZvY3VzZWQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tYXhSYW5nZSA9IHRoaXMubWluUmFuZ2U7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5taW5SYW5nZSA9ICcnO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnNpbGVudCkgcmV0dXJuO1xyXG4gICAgICAgICAgICB0aGlzLmRhdGUgPSB2YWw7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZ2V0IGZvY3VzZWQoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9mb2N1c2VkO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGdldCBwYXJzZWREYXRlKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gZGF0ZXBpY2tlci5nZXRQYXJzZWREYXRlKHRoaXMuZGF0ZSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgc2V0IGRhdGUgKHZhbCkge1xyXG4gICAgICAgICAgICBpZiAoISh2YWwgaW5zdGFuY2VvZiBEYXRlKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50RGF0ZSA9IHZhbDtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmluaXRlZCAmJiAhdGhpcy5zaWxlbnQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2xvb3Blcih0aGlzLnZpZXdzW3RoaXMudmlld10sICdfcmVuZGVyJyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5hdi5fcmVuZGVyKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy52aXNpYmxlICYmIHRoaXMuZWxJc0lucHV0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB2YWw7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZ2V0IGRhdGUgKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jdXJyZW50RGF0ZVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHNldCB2aWV3ICh2YWwpIHtcclxuICAgICAgICAgICAgdGhpcy52aWV3SW5kZXggPSB0aGlzLnZpZXdJbmRleGVzLmluZGV4T2YodmFsKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnZpZXdJbmRleCA8IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5wcmV2VmlldyA9IHRoaXMuY3VycmVudFZpZXc7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFZpZXcgPSB2YWw7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5pbml0ZWQpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy52aWV3c1t2YWxdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy52aWV3c1t2YWxdID0gbmV3ICAkLmZuLmRhdGVwaWNrZXIuQm9keSh0aGlzLCB2YWwsIHRoaXMub3B0cylcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy52aWV3c1t2YWxdLl9yZW5kZXIoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnZpZXdzW3RoaXMucHJldlZpZXddLmhpZGUoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMudmlld3NbdmFsXS5zaG93KCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5hdi5fcmVuZGVyKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub3B0cy5vbkNoYW5nZVZpZXcpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9wdHMub25DaGFuZ2VWaWV3KHZhbClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmVsSXNJbnB1dCAmJiB0aGlzLnZpc2libGUpIHRoaXMuc2V0UG9zaXRpb24oKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHZhbFxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGdldCB2aWV3KCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jdXJyZW50VmlldztcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBnZXQgY2VsbFR5cGUoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZpZXcuc3Vic3RyaW5nKDAsIHRoaXMudmlldy5sZW5ndGggLSAxKVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGdldCBtaW5UaW1lKCkge1xyXG4gICAgICAgICAgICB2YXIgbWluID0gZGF0ZXBpY2tlci5nZXRQYXJzZWREYXRlKHRoaXMubWluRGF0ZSk7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgRGF0ZShtaW4ueWVhciwgbWluLm1vbnRoLCBtaW4uZGF0ZSkuZ2V0VGltZSgpXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZ2V0IG1heFRpbWUoKSB7XHJcbiAgICAgICAgICAgIHZhciBtYXggPSBkYXRlcGlja2VyLmdldFBhcnNlZERhdGUodGhpcy5tYXhEYXRlKTtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBEYXRlKG1heC55ZWFyLCBtYXgubW9udGgsIG1heC5kYXRlKS5nZXRUaW1lKClcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBnZXQgY3VyRGVjYWRlKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gZGF0ZXBpY2tlci5nZXREZWNhZGUodGhpcy5kYXRlKVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgLy8gIFV0aWxzXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgZGF0ZXBpY2tlci5nZXREYXlzQ291bnQgPSBmdW5jdGlvbiAoZGF0ZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgRGF0ZShkYXRlLmdldEZ1bGxZZWFyKCksIGRhdGUuZ2V0TW9udGgoKSArIDEsIDApLmdldERhdGUoKTtcclxuICAgIH07XHJcblxyXG4gICAgZGF0ZXBpY2tlci5nZXRQYXJzZWREYXRlID0gZnVuY3Rpb24gKGRhdGUpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB5ZWFyOiBkYXRlLmdldEZ1bGxZZWFyKCksXHJcbiAgICAgICAgICAgIG1vbnRoOiBkYXRlLmdldE1vbnRoKCksXHJcbiAgICAgICAgICAgIGZ1bGxNb250aDogKGRhdGUuZ2V0TW9udGgoKSArIDEpIDwgMTAgPyAnMCcgKyAoZGF0ZS5nZXRNb250aCgpICsgMSkgOiBkYXRlLmdldE1vbnRoKCkgKyAxLCAvLyBPbmUgYmFzZWRcclxuICAgICAgICAgICAgZGF0ZTogZGF0ZS5nZXREYXRlKCksXHJcbiAgICAgICAgICAgIGZ1bGxEYXRlOiBkYXRlLmdldERhdGUoKSA8IDEwID8gJzAnICsgZGF0ZS5nZXREYXRlKCkgOiBkYXRlLmdldERhdGUoKSxcclxuICAgICAgICAgICAgZGF5OiBkYXRlLmdldERheSgpLFxyXG4gICAgICAgICAgICBob3VyczogZGF0ZS5nZXRIb3VycygpLFxyXG4gICAgICAgICAgICBmdWxsSG91cnM6ICBkYXRlLmdldEhvdXJzKCkgPCAxMCA/ICcwJyArIGRhdGUuZ2V0SG91cnMoKSA6ICBkYXRlLmdldEhvdXJzKCkgLFxyXG4gICAgICAgICAgICBtaW51dGVzOiBkYXRlLmdldE1pbnV0ZXMoKSxcclxuICAgICAgICAgICAgZnVsbE1pbnV0ZXM6ICBkYXRlLmdldE1pbnV0ZXMoKSA8IDEwID8gJzAnICsgZGF0ZS5nZXRNaW51dGVzKCkgOiAgZGF0ZS5nZXRNaW51dGVzKClcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIGRhdGVwaWNrZXIuZ2V0RGVjYWRlID0gZnVuY3Rpb24gKGRhdGUpIHtcclxuICAgICAgICB2YXIgZmlyc3RZZWFyID0gTWF0aC5mbG9vcihkYXRlLmdldEZ1bGxZZWFyKCkgLyAxMCkgKiAxMDtcclxuXHJcbiAgICAgICAgcmV0dXJuIFtmaXJzdFllYXIsIGZpcnN0WWVhciArIDldO1xyXG4gICAgfTtcclxuXHJcbiAgICBkYXRlcGlja2VyLnRlbXBsYXRlID0gZnVuY3Rpb24gKHN0ciwgZGF0YSkge1xyXG4gICAgICAgIHJldHVybiBzdHIucmVwbGFjZSgvI1xceyhbXFx3XSspXFx9L2csIGZ1bmN0aW9uIChzb3VyY2UsIG1hdGNoKSB7XHJcbiAgICAgICAgICAgIGlmIChkYXRhW21hdGNoXSB8fCBkYXRhW21hdGNoXSA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGFbbWF0Y2hdXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH07XHJcblxyXG4gICAgZGF0ZXBpY2tlci5pc1NhbWUgPSBmdW5jdGlvbiAoZGF0ZTEsIGRhdGUyLCB0eXBlKSB7XHJcbiAgICAgICAgaWYgKCFkYXRlMSB8fCAhZGF0ZTIpIHJldHVybiBmYWxzZTtcclxuICAgICAgICB2YXIgZDEgPSBkYXRlcGlja2VyLmdldFBhcnNlZERhdGUoZGF0ZTEpLFxyXG4gICAgICAgICAgICBkMiA9IGRhdGVwaWNrZXIuZ2V0UGFyc2VkRGF0ZShkYXRlMiksXHJcbiAgICAgICAgICAgIF90eXBlID0gdHlwZSA/IHR5cGUgOiAnZGF5JyxcclxuXHJcbiAgICAgICAgICAgIGNvbmRpdGlvbnMgPSB7XHJcbiAgICAgICAgICAgICAgICBkYXk6IGQxLmRhdGUgPT0gZDIuZGF0ZSAmJiBkMS5tb250aCA9PSBkMi5tb250aCAmJiBkMS55ZWFyID09IGQyLnllYXIsXHJcbiAgICAgICAgICAgICAgICBtb250aDogZDEubW9udGggPT0gZDIubW9udGggJiYgZDEueWVhciA9PSBkMi55ZWFyLFxyXG4gICAgICAgICAgICAgICAgeWVhcjogZDEueWVhciA9PSBkMi55ZWFyXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgIHJldHVybiBjb25kaXRpb25zW190eXBlXTtcclxuICAgIH07XHJcblxyXG4gICAgZGF0ZXBpY2tlci5sZXNzID0gZnVuY3Rpb24gKGRhdGVDb21wYXJlVG8sIGRhdGUsIHR5cGUpIHtcclxuICAgICAgICBpZiAoIWRhdGVDb21wYXJlVG8gfHwgIWRhdGUpIHJldHVybiBmYWxzZTtcclxuICAgICAgICByZXR1cm4gZGF0ZS5nZXRUaW1lKCkgPCBkYXRlQ29tcGFyZVRvLmdldFRpbWUoKTtcclxuICAgIH07XHJcblxyXG4gICAgZGF0ZXBpY2tlci5iaWdnZXIgPSBmdW5jdGlvbiAoZGF0ZUNvbXBhcmVUbywgZGF0ZSwgdHlwZSkge1xyXG4gICAgICAgIGlmICghZGF0ZUNvbXBhcmVUbyB8fCAhZGF0ZSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIHJldHVybiBkYXRlLmdldFRpbWUoKSA+IGRhdGVDb21wYXJlVG8uZ2V0VGltZSgpO1xyXG4gICAgfTtcclxuXHJcbiAgICBkYXRlcGlja2VyLmdldExlYWRpbmdaZXJvTnVtID0gZnVuY3Rpb24gKG51bSkge1xyXG4gICAgICAgIHJldHVybiBwYXJzZUludChudW0pIDwgMTAgPyAnMCcgKyBudW0gOiBudW07XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmV0dXJucyBjb3B5IG9mIGRhdGUgd2l0aCBob3VycyBhbmQgbWludXRlcyBlcXVhbHMgdG8gMFxyXG4gICAgICogQHBhcmFtIGRhdGUge0RhdGV9XHJcbiAgICAgKi9cclxuICAgIGRhdGVwaWNrZXIucmVzZXRUaW1lID0gZnVuY3Rpb24gKGRhdGUpIHtcclxuICAgICAgICBpZiAodHlwZW9mIGRhdGUgIT0gJ29iamVjdCcpIHJldHVybjtcclxuICAgICAgICBkYXRlID0gZGF0ZXBpY2tlci5nZXRQYXJzZWREYXRlKGRhdGUpO1xyXG4gICAgICAgIHJldHVybiBuZXcgRGF0ZShkYXRlLnllYXIsIGRhdGUubW9udGgsIGRhdGUuZGF0ZSlcclxuICAgIH07XHJcblxyXG4gICAgJC5mbi5kYXRlcGlja2VyID0gZnVuY3Rpb24gKCBvcHRpb25zICkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAoISQuZGF0YSh0aGlzLCBwbHVnaW5OYW1lKSkge1xyXG4gICAgICAgICAgICAgICAgJC5kYXRhKHRoaXMsICBwbHVnaW5OYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIG5ldyBEYXRlcGlja2VyKCB0aGlzLCBvcHRpb25zICkpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdmFyIF90aGlzID0gJC5kYXRhKHRoaXMsIHBsdWdpbk5hbWUpO1xyXG5cclxuICAgICAgICAgICAgICAgIF90aGlzLm9wdHMgPSAkLmV4dGVuZCh0cnVlLCBfdGhpcy5vcHRzLCBvcHRpb25zKTtcclxuICAgICAgICAgICAgICAgIF90aGlzLnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG5cclxuICAgICQuZm4uZGF0ZXBpY2tlci5Db25zdHJ1Y3RvciA9IERhdGVwaWNrZXI7XHJcblxyXG4gICAgJC5mbi5kYXRlcGlja2VyLmxhbmd1YWdlID0ge1xyXG4gICAgICAgIHJ1OiB7XHJcbiAgICAgICAgICAgIGRheXM6IFsn0JLQvtGB0LrRgNC10YHQtdC90YzQtScsICfQn9C+0L3QtdC00LXQu9GM0L3QuNC6JywgJ9CS0YLQvtGA0L3QuNC6JywgJ9Ch0YDQtdC00LAnLCAn0KfQtdGC0LLQtdGA0LMnLCAn0J/Rj9GC0L3QuNGG0LAnLCAn0KHRg9Cx0LHQvtGC0LAnXSxcclxuICAgICAgICAgICAgZGF5c1Nob3J0OiBbJ9CS0L7RgScsJ9Cf0L7QvScsJ9CS0YLQvicsJ9Ch0YDQtScsJ9Cn0LXRgicsJ9Cf0Y/RgicsJ9Ch0YPQsSddLFxyXG4gICAgICAgICAgICBkYXlzTWluOiBbJ9CS0YEnLCfQn9C9Jywn0JLRgicsJ9Ch0YAnLCfQp9GCJywn0J/RgicsJ9Ch0LEnXSxcclxuICAgICAgICAgICAgbW9udGhzOiBbJ9Cv0L3QstCw0YDRjCcsICfQpNC10LLRgNCw0LvRjCcsICfQnNCw0YDRgicsICfQkNC/0YDQtdC70YwnLCAn0JzQsNC5JywgJ9CY0Y7QvdGMJywgJ9CY0Y7Qu9GMJywgJ9CQ0LLQs9GD0YHRgicsICfQodC10L3RgtGP0LHRgNGMJywgJ9Ce0LrRgtGP0LHRgNGMJywgJ9Cd0L7Rj9Cx0YDRjCcsICfQlNC10LrQsNCx0YDRjCddLFxyXG4gICAgICAgICAgICBtb250aHNTaG9ydDogWyfQr9C90LInLCAn0KTQtdCyJywgJ9Cc0LDRgCcsICfQkNC/0YAnLCAn0JzQsNC5JywgJ9CY0Y7QvScsICfQmNGO0LsnLCAn0JDQstCzJywgJ9Ch0LXQvScsICfQntC60YInLCAn0J3QvtGPJywgJ9CU0LXQuiddLFxyXG4gICAgICAgICAgICB0b2RheTogJ9Ch0LXQs9C+0LTQvdGPJyxcclxuICAgICAgICAgICAgY2xlYXI6ICfQntGH0LjRgdGC0LjRgtGMJyxcclxuICAgICAgICAgICAgZGF0ZUZvcm1hdDogJ2RkLm1tLnl5eXknLFxyXG4gICAgICAgICAgICB0aW1lRm9ybWF0OiAnaGg6aWknLFxyXG4gICAgICAgICAgICBmaXJzdERheTogMVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgJChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgJChhdXRvSW5pdFNlbGVjdG9yKS5kYXRlcGlja2VyKCk7XHJcbiAgICB9KVxyXG5cclxufSkoKTtcclxuIiwiOyhmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdGVtcGxhdGVzID0ge1xyXG4gICAgICAgIGRheXM6JycgK1xyXG4gICAgICAgICc8ZGl2IGNsYXNzPVwiZGF0ZXBpY2tlci0tZGF5cyBkYXRlcGlja2VyLS1ib2R5XCI+JyArXHJcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJkYXRlcGlja2VyLS1kYXlzLW5hbWVzXCI+PC9kaXY+JyArXHJcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJkYXRlcGlja2VyLS1jZWxscyBkYXRlcGlja2VyLS1jZWxscy1kYXlzXCI+PC9kaXY+JyArXHJcbiAgICAgICAgJzwvZGl2PicsXHJcbiAgICAgICAgbW9udGhzOiAnJyArXHJcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJkYXRlcGlja2VyLS1tb250aHMgZGF0ZXBpY2tlci0tYm9keVwiPicgK1xyXG4gICAgICAgICc8ZGl2IGNsYXNzPVwiZGF0ZXBpY2tlci0tY2VsbHMgZGF0ZXBpY2tlci0tY2VsbHMtbW9udGhzXCI+PC9kaXY+JyArXHJcbiAgICAgICAgJzwvZGl2PicsXHJcbiAgICAgICAgeWVhcnM6ICcnICtcclxuICAgICAgICAnPGRpdiBjbGFzcz1cImRhdGVwaWNrZXItLXllYXJzIGRhdGVwaWNrZXItLWJvZHlcIj4nICtcclxuICAgICAgICAnPGRpdiBjbGFzcz1cImRhdGVwaWNrZXItLWNlbGxzIGRhdGVwaWNrZXItLWNlbGxzLXllYXJzXCI+PC9kaXY+JyArXHJcbiAgICAgICAgJzwvZGl2PidcclxuICAgICAgICB9LFxyXG4gICAgICAgIGRhdGVwaWNrZXIgPSAkLmZuLmRhdGVwaWNrZXIsXHJcbiAgICAgICAgZHAgPSBkYXRlcGlja2VyLkNvbnN0cnVjdG9yO1xyXG5cclxuICAgIGRhdGVwaWNrZXIuQm9keSA9IGZ1bmN0aW9uIChkLCB0eXBlLCBvcHRzLCBpbmRleCkge1xyXG4gICAgICAgIHRoaXMuZCA9IGQ7XHJcbiAgICAgICAgdGhpcy50eXBlID0gdHlwZTtcclxuICAgICAgICB0aGlzLm9wdHMgPSBvcHRzO1xyXG4gICAgICAgIHRoaXMuJGVsID0gJCgnJyk7XHJcbiAgICAgICAgdGhpcy5pbmRleCA9IGluZGV4O1xyXG5cclxuICAgICAgICBpZiAodGhpcy5vcHRzLm9ubHlUaW1lcGlja2VyKSByZXR1cm47XHJcbiAgICAgICAgdGhpcy5pbml0KCk7XHJcbiAgICB9O1xyXG5cclxuICAgIGRhdGVwaWNrZXIuQm9keS5wcm90b3R5cGUgPSB7XHJcbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0aGlzLl9idWlsZEJhc2VIdG1sKCk7XHJcbiAgICAgICAgICAgIHRoaXMuX3JlbmRlcigpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5fYmluZEV2ZW50cygpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9iaW5kRXZlbnRzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGVsLm9uKCdjbGljaycsICcuZGF0ZXBpY2tlci0tY2VsbCcsICQucHJveHkodGhpcy5fb25DbGlja0NlbGwsIHRoaXMpKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfYnVpbGRCYXNlSHRtbDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0aGlzLiRlbCA9ICQodGVtcGxhdGVzW3RoaXMudHlwZV0pLmFwcGVuZFRvKHRoaXMuZC4kY29udGVudCk7XHJcbiAgICAgICAgICAgIHRoaXMuJG5hbWVzID0gJCgnLmRhdGVwaWNrZXItLWRheXMtbmFtZXMnLCB0aGlzLiRlbCk7XHJcbiAgICAgICAgICAgIHRoaXMuJGNlbGxzID0gJCgnLmRhdGVwaWNrZXItLWNlbGxzJywgdGhpcy4kZWwpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9nZXREYXlOYW1lc0h0bWw6IGZ1bmN0aW9uIChmaXJzdERheSwgY3VyRGF5LCBodG1sLCBpKSB7XHJcbiAgICAgICAgICAgIGN1ckRheSA9IGN1ckRheSAhPSB1bmRlZmluZWQgPyBjdXJEYXkgOiBmaXJzdERheTtcclxuICAgICAgICAgICAgaHRtbCA9IGh0bWwgPyBodG1sIDogJyc7XHJcbiAgICAgICAgICAgIGkgPSBpICE9IHVuZGVmaW5lZCA/IGkgOiAwO1xyXG5cclxuICAgICAgICAgICAgaWYgKGkgPiA3KSByZXR1cm4gaHRtbDtcclxuICAgICAgICAgICAgaWYgKGN1ckRheSA9PSA3KSByZXR1cm4gdGhpcy5fZ2V0RGF5TmFtZXNIdG1sKGZpcnN0RGF5LCAwLCBodG1sLCArK2kpO1xyXG5cclxuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cImRhdGVwaWNrZXItLWRheS1uYW1lJyArICh0aGlzLmQuaXNXZWVrZW5kKGN1ckRheSkgPyBcIiAtd2Vla2VuZC1cIiA6IFwiXCIpICsgJ1wiPicgKyB0aGlzLmQubG9jLmRheXNNaW5bY3VyRGF5XSArICc8L2Rpdj4nO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2dldERheU5hbWVzSHRtbChmaXJzdERheSwgKytjdXJEYXksIGh0bWwsICsraSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2dldENlbGxDb250ZW50czogZnVuY3Rpb24gKGRhdGUsIHR5cGUpIHtcclxuICAgICAgICAgICAgdmFyIGNsYXNzZXMgPSBcImRhdGVwaWNrZXItLWNlbGwgZGF0ZXBpY2tlci0tY2VsbC1cIiArIHR5cGUsXHJcbiAgICAgICAgICAgICAgICBjdXJyZW50RGF0ZSA9IG5ldyBEYXRlKCksXHJcbiAgICAgICAgICAgICAgICBwYXJlbnQgPSB0aGlzLmQsXHJcbiAgICAgICAgICAgICAgICBtaW5SYW5nZSA9IGRwLnJlc2V0VGltZShwYXJlbnQubWluUmFuZ2UpLFxyXG4gICAgICAgICAgICAgICAgbWF4UmFuZ2UgPSBkcC5yZXNldFRpbWUocGFyZW50Lm1heFJhbmdlKSxcclxuICAgICAgICAgICAgICAgIG9wdHMgPSBwYXJlbnQub3B0cyxcclxuICAgICAgICAgICAgICAgIGQgPSBkcC5nZXRQYXJzZWREYXRlKGRhdGUpLFxyXG4gICAgICAgICAgICAgICAgcmVuZGVyID0ge30sXHJcbiAgICAgICAgICAgICAgICBodG1sID0gZC5kYXRlO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoICh0eXBlKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdkYXknOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJlbnQuaXNXZWVrZW5kKGQuZGF5KSkgY2xhc3NlcyArPSBcIiAtd2Vla2VuZC1cIjtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZC5tb250aCAhPSB0aGlzLmxvY2FsVmlld0RhdGUubW9udGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NlcyArPSBcIiAtb3RoZXItbW9udGgtXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghb3B0cy5zZWxlY3RPdGhlck1vbnRocykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NlcyArPSBcIiAtZGlzYWJsZWQtXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFvcHRzLnNob3dPdGhlck1vbnRocykgaHRtbCA9ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ21vbnRoJzpcclxuICAgICAgICAgICAgICAgICAgICBodG1sID0gcGFyZW50LmxvY1twYXJlbnQub3B0cy5tb250aHNGaWVsZF1bZC5tb250aF07XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICd5ZWFyJzpcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZGVjYWRlID0gcGFyZW50LmN1ckRlY2FkZTtcclxuICAgICAgICAgICAgICAgICAgICBodG1sID0gZC55ZWFyO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkLnllYXIgPCBkZWNhZGVbMF0gfHwgZC55ZWFyID4gZGVjYWRlWzFdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzZXMgKz0gJyAtb3RoZXItZGVjYWRlLSc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghb3B0cy5zZWxlY3RPdGhlclllYXJzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc2VzICs9IFwiIC1kaXNhYmxlZC1cIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW9wdHMuc2hvd090aGVyWWVhcnMpIGh0bWwgPSAnJztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChvcHRzLm9uUmVuZGVyQ2VsbCkge1xyXG4gICAgICAgICAgICAgICAgcmVuZGVyID0gb3B0cy5vblJlbmRlckNlbGwoZGF0ZSwgdHlwZSkgfHwge307XHJcbiAgICAgICAgICAgICAgICBodG1sID0gcmVuZGVyLmh0bWwgPyByZW5kZXIuaHRtbCA6IGh0bWw7XHJcbiAgICAgICAgICAgICAgICBjbGFzc2VzICs9IHJlbmRlci5jbGFzc2VzID8gJyAnICsgcmVuZGVyLmNsYXNzZXMgOiAnJztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG9wdHMucmFuZ2UpIHtcclxuICAgICAgICAgICAgICAgIGlmIChkcC5pc1NhbWUobWluUmFuZ2UsIGRhdGUsIHR5cGUpKSBjbGFzc2VzICs9ICcgLXJhbmdlLWZyb20tJztcclxuICAgICAgICAgICAgICAgIGlmIChkcC5pc1NhbWUobWF4UmFuZ2UsIGRhdGUsIHR5cGUpKSBjbGFzc2VzICs9ICcgLXJhbmdlLXRvLSc7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHBhcmVudC5zZWxlY3RlZERhdGVzLmxlbmd0aCA9PSAxICYmIHBhcmVudC5mb2N1c2VkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAoZHAuYmlnZ2VyKG1pblJhbmdlLCBkYXRlKSAmJiBkcC5sZXNzKHBhcmVudC5mb2N1c2VkLCBkYXRlKSkgfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAgKGRwLmxlc3MobWF4UmFuZ2UsIGRhdGUpICYmIGRwLmJpZ2dlcihwYXJlbnQuZm9jdXNlZCwgZGF0ZSkpKVxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NlcyArPSAnIC1pbi1yYW5nZS0nXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoZHAubGVzcyhtYXhSYW5nZSwgZGF0ZSkgJiYgZHAuaXNTYW1lKHBhcmVudC5mb2N1c2VkLCBkYXRlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzc2VzICs9ICcgLXJhbmdlLWZyb20tJ1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoZHAuYmlnZ2VyKG1pblJhbmdlLCBkYXRlKSAmJiBkcC5pc1NhbWUocGFyZW50LmZvY3VzZWQsIGRhdGUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzZXMgKz0gJyAtcmFuZ2UtdG8tJ1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBhcmVudC5zZWxlY3RlZERhdGVzLmxlbmd0aCA9PSAyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRwLmJpZ2dlcihtaW5SYW5nZSwgZGF0ZSkgJiYgZHAubGVzcyhtYXhSYW5nZSwgZGF0ZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NlcyArPSAnIC1pbi1yYW5nZS0nXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgaWYgKGRwLmlzU2FtZShjdXJyZW50RGF0ZSwgZGF0ZSwgdHlwZSkpIGNsYXNzZXMgKz0gJyAtY3VycmVudC0nO1xyXG4gICAgICAgICAgICBpZiAocGFyZW50LmZvY3VzZWQgJiYgZHAuaXNTYW1lKGRhdGUsIHBhcmVudC5mb2N1c2VkLCB0eXBlKSkgY2xhc3NlcyArPSAnIC1mb2N1cy0nO1xyXG4gICAgICAgICAgICBpZiAocGFyZW50Ll9pc1NlbGVjdGVkKGRhdGUsIHR5cGUpKSBjbGFzc2VzICs9ICcgLXNlbGVjdGVkLSc7XHJcbiAgICAgICAgICAgIGlmICghcGFyZW50Ll9pc0luUmFuZ2UoZGF0ZSwgdHlwZSkgfHwgcmVuZGVyLmRpc2FibGVkKSBjbGFzc2VzICs9ICcgLWRpc2FibGVkLSc7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgaHRtbDogaHRtbCxcclxuICAgICAgICAgICAgICAgIGNsYXNzZXM6IGNsYXNzZXNcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENhbGN1bGF0ZXMgZGF5cyBudW1iZXIgdG8gcmVuZGVyLiBHZW5lcmF0ZXMgZGF5cyBodG1sIGFuZCByZXR1cm5zIGl0LlxyXG4gICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRlIC0gRGF0ZSBvYmplY3RcclxuICAgICAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxyXG4gICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgX2dldERheXNIdG1sOiBmdW5jdGlvbiAoZGF0ZSkge1xyXG4gICAgICAgICAgICB2YXIgdG90YWxNb250aERheXMgPSBkcC5nZXREYXlzQ291bnQoZGF0ZSksXHJcbiAgICAgICAgICAgICAgICBmaXJzdE1vbnRoRGF5ID0gbmV3IERhdGUoZGF0ZS5nZXRGdWxsWWVhcigpLCBkYXRlLmdldE1vbnRoKCksIDEpLmdldERheSgpLFxyXG4gICAgICAgICAgICAgICAgbGFzdE1vbnRoRGF5ID0gbmV3IERhdGUoZGF0ZS5nZXRGdWxsWWVhcigpLCBkYXRlLmdldE1vbnRoKCksIHRvdGFsTW9udGhEYXlzKS5nZXREYXkoKSxcclxuICAgICAgICAgICAgICAgIGRheXNGcm9tUGV2TW9udGggPSBmaXJzdE1vbnRoRGF5IC0gdGhpcy5kLmxvYy5maXJzdERheSxcclxuICAgICAgICAgICAgICAgIGRheXNGcm9tTmV4dE1vbnRoID0gNiAtIGxhc3RNb250aERheSArIHRoaXMuZC5sb2MuZmlyc3REYXk7XHJcblxyXG4gICAgICAgICAgICBkYXlzRnJvbVBldk1vbnRoID0gZGF5c0Zyb21QZXZNb250aCA8IDAgPyBkYXlzRnJvbVBldk1vbnRoICsgNyA6IGRheXNGcm9tUGV2TW9udGg7XHJcbiAgICAgICAgICAgIGRheXNGcm9tTmV4dE1vbnRoID0gZGF5c0Zyb21OZXh0TW9udGggPiA2ID8gZGF5c0Zyb21OZXh0TW9udGggLSA3IDogZGF5c0Zyb21OZXh0TW9udGg7XHJcblxyXG4gICAgICAgICAgICB2YXIgc3RhcnREYXlJbmRleCA9IC1kYXlzRnJvbVBldk1vbnRoICsgMSxcclxuICAgICAgICAgICAgICAgIG0sIHksXHJcbiAgICAgICAgICAgICAgICBodG1sID0gJyc7XHJcblxyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gc3RhcnREYXlJbmRleCwgbWF4ID0gdG90YWxNb250aERheXMgKyBkYXlzRnJvbU5leHRNb250aDsgaSA8PSBtYXg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgeSA9IGRhdGUuZ2V0RnVsbFllYXIoKTtcclxuICAgICAgICAgICAgICAgIG0gPSBkYXRlLmdldE1vbnRoKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaHRtbCArPSB0aGlzLl9nZXREYXlIdG1sKG5ldyBEYXRlKHksIG0sIGkpKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gaHRtbDtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfZ2V0RGF5SHRtbDogZnVuY3Rpb24gKGRhdGUpIHtcclxuICAgICAgICAgICB2YXIgY29udGVudCA9IHRoaXMuX2dldENlbGxDb250ZW50cyhkYXRlLCAnZGF5Jyk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gJzxkaXYgY2xhc3M9XCInICsgY29udGVudC5jbGFzc2VzICsgJ1wiICcgK1xyXG4gICAgICAgICAgICAgICAgJ2RhdGEtZGF0ZT1cIicgKyBkYXRlLmdldERhdGUoKSArICdcIiAnICtcclxuICAgICAgICAgICAgICAgICdkYXRhLW1vbnRoPVwiJyArIGRhdGUuZ2V0TW9udGgoKSArICdcIiAnICtcclxuICAgICAgICAgICAgICAgICdkYXRhLXllYXI9XCInICsgZGF0ZS5nZXRGdWxsWWVhcigpICsgJ1wiPicgKyBjb250ZW50Lmh0bWwgKyAnPC9kaXY+JztcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBHZW5lcmF0ZXMgbW9udGhzIGh0bWxcclxuICAgICAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0ZSAtIGRhdGUgaW5zdGFuY2VcclxuICAgICAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxyXG4gICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgX2dldE1vbnRoc0h0bWw6IGZ1bmN0aW9uIChkYXRlKSB7XHJcbiAgICAgICAgICAgIHZhciBodG1sID0gJycsXHJcbiAgICAgICAgICAgICAgICBkID0gZHAuZ2V0UGFyc2VkRGF0ZShkYXRlKSxcclxuICAgICAgICAgICAgICAgIGkgPSAwO1xyXG5cclxuICAgICAgICAgICAgd2hpbGUoaSA8IDEyKSB7XHJcbiAgICAgICAgICAgICAgICBodG1sICs9IHRoaXMuX2dldE1vbnRoSHRtbChuZXcgRGF0ZShkLnllYXIsIGkpKTtcclxuICAgICAgICAgICAgICAgIGkrK1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gaHRtbDtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfZ2V0TW9udGhIdG1sOiBmdW5jdGlvbiAoZGF0ZSkge1xyXG4gICAgICAgICAgICB2YXIgY29udGVudCA9IHRoaXMuX2dldENlbGxDb250ZW50cyhkYXRlLCAnbW9udGgnKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiAnPGRpdiBjbGFzcz1cIicgKyBjb250ZW50LmNsYXNzZXMgKyAnXCIgZGF0YS1tb250aD1cIicgKyBkYXRlLmdldE1vbnRoKCkgKyAnXCI+JyArIGNvbnRlbnQuaHRtbCArICc8L2Rpdj4nXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2dldFllYXJzSHRtbDogZnVuY3Rpb24gKGRhdGUpIHtcclxuICAgICAgICAgICAgdmFyIGQgPSBkcC5nZXRQYXJzZWREYXRlKGRhdGUpLFxyXG4gICAgICAgICAgICAgICAgZGVjYWRlID0gZHAuZ2V0RGVjYWRlKGRhdGUpLFxyXG4gICAgICAgICAgICAgICAgZmlyc3RZZWFyID0gZGVjYWRlWzBdIC0gMSxcclxuICAgICAgICAgICAgICAgIGh0bWwgPSAnJyxcclxuICAgICAgICAgICAgICAgIGkgPSBmaXJzdFllYXI7XHJcblxyXG4gICAgICAgICAgICBmb3IgKGk7IGkgPD0gZGVjYWRlWzFdICsgMTsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBodG1sICs9IHRoaXMuX2dldFllYXJIdG1sKG5ldyBEYXRlKGkgLCAwKSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBodG1sO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9nZXRZZWFySHRtbDogZnVuY3Rpb24gKGRhdGUpIHtcclxuICAgICAgICAgICAgdmFyIGNvbnRlbnQgPSB0aGlzLl9nZXRDZWxsQ29udGVudHMoZGF0ZSwgJ3llYXInKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiAnPGRpdiBjbGFzcz1cIicgKyBjb250ZW50LmNsYXNzZXMgKyAnXCIgZGF0YS15ZWFyPVwiJyArIGRhdGUuZ2V0RnVsbFllYXIoKSArICdcIj4nICsgY29udGVudC5odG1sICsgJzwvZGl2PidcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfcmVuZGVyVHlwZXM6IHtcclxuICAgICAgICAgICAgZGF5czogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHBhcnNlZCA9IGRwLmdldFBhcnNlZERhdGUodGhpcy5kLmN1cnJlbnREYXRlKSxcclxuICAgICAgICAgICAgICAgICAgICBkYXlOYW1lcyA9IHRoaXMuX2dldERheU5hbWVzSHRtbCh0aGlzLmQubG9jLmZpcnN0RGF5KSxcclxuICAgICAgICAgICAgICAgICAgICBkYXlzID0gdGhpcy5fZ2V0RGF5c0h0bWwobmV3IERhdGUocGFyc2VkLnllYXIsIHBhcnNlZC5tb250aCArIHRoaXMuaW5kZXgsIDEpKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLiRjZWxscy5odG1sKGRheXMpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kbmFtZXMuaHRtbChkYXlOYW1lcylcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbW9udGhzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgaHRtbCA9IHRoaXMuX2dldE1vbnRoc0h0bWwodGhpcy5kLmN1cnJlbnREYXRlKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLiRjZWxscy5odG1sKGh0bWwpXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHllYXJzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgaHRtbCA9IHRoaXMuX2dldFllYXJzSHRtbCh0aGlzLmQuY3VycmVudERhdGUpO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuJGNlbGxzLmh0bWwoaHRtbClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9yZW5kZXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMub3B0cy5vbmx5VGltZXBpY2tlcikgcmV0dXJuO1xyXG4gICAgICAgICAgICB0aGlzLl9yZW5kZXJUeXBlc1t0aGlzLnR5cGVdLmJpbmQodGhpcykoKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfdXBkYXRlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHZhciAkY2VsbHMgPSAkKCcuZGF0ZXBpY2tlci0tY2VsbCcsIHRoaXMuJGNlbGxzKSxcclxuICAgICAgICAgICAgICAgIF90aGlzID0gdGhpcyxcclxuICAgICAgICAgICAgICAgIGNsYXNzZXMsXHJcbiAgICAgICAgICAgICAgICAkY2VsbCxcclxuICAgICAgICAgICAgICAgIGRhdGU7XHJcbiAgICAgICAgICAgICRjZWxscy5lYWNoKGZ1bmN0aW9uIChjZWxsLCBpKSB7XHJcbiAgICAgICAgICAgICAgICAkY2VsbCA9ICQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICBkYXRlID0gX3RoaXMuZC5fZ2V0RGF0ZUZyb21DZWxsKCQodGhpcykpO1xyXG4gICAgICAgICAgICAgICAgY2xhc3NlcyA9IF90aGlzLl9nZXRDZWxsQ29udGVudHMoZGF0ZSwgX3RoaXMuZC5jZWxsVHlwZSk7XHJcbiAgICAgICAgICAgICAgICAkY2VsbC5hdHRyKCdjbGFzcycsY2xhc3Nlcy5jbGFzc2VzKVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBzaG93OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdHMub25seVRpbWVwaWNrZXIpIHJldHVybjtcclxuICAgICAgICAgICAgdGhpcy4kZWwuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xyXG4gICAgICAgICAgICB0aGlzLmFjaXR2ZSA9IHRydWU7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgaGlkZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0aGlzLiRlbC5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aXZlID0gZmFsc2U7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZ2V0IGxvY2FsVmlld0RhdGUoKXtcclxuICAgICAgICAgICAgdmFyIHZpZXdEYXRlID0gdGhpcy5kLnBhcnNlZERhdGUsXHJcbiAgICAgICAgICAgICAgICBpbmRleCA9IHRoaXMuaW5kZXg7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZHAuZ2V0UGFyc2VkRGF0ZShuZXcgRGF0ZSh2aWV3RGF0ZS55ZWFyLCB2aWV3RGF0ZS5tb250aCArIGluZGV4LCB2aWV3RGF0ZS5kYXRlKSlcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvLyAgRXZlbnRzXHJcbiAgICAgICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgICAgICBfaGFuZGxlQ2xpY2s6IGZ1bmN0aW9uIChlbCkge1xyXG4gICAgICAgICAgICB2YXIgZGF0ZSA9IGVsLmRhdGEoJ2RhdGUnKSB8fCAxLFxyXG4gICAgICAgICAgICAgICAgbW9udGggPSBlbC5kYXRhKCdtb250aCcpIHx8IDAsXHJcbiAgICAgICAgICAgICAgICB5ZWFyID0gZWwuZGF0YSgneWVhcicpIHx8IHRoaXMuZC5wYXJzZWREYXRlLnllYXIsXHJcbiAgICAgICAgICAgICAgICBkcCA9IHRoaXMuZDtcclxuICAgICAgICAgICAgLy8gQ2hhbmdlIHZpZXcgaWYgbWluIHZpZXcgZG9lcyBub3QgcmVhY2ggeWV0XHJcbiAgICAgICAgICAgIGlmIChkcC52aWV3ICE9IHRoaXMub3B0cy5taW5WaWV3KSB7XHJcbiAgICAgICAgICAgICAgICBkcC5kb3duKG5ldyBEYXRlKHllYXIsIG1vbnRoLCBkYXRlKSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gU2VsZWN0IGRhdGUgaWYgbWluIHZpZXcgaXMgcmVhY2hlZFxyXG4gICAgICAgICAgICB2YXIgc2VsZWN0ZWREYXRlID0gbmV3IERhdGUoeWVhciwgbW9udGgsIGRhdGUpLFxyXG4gICAgICAgICAgICAgICAgYWxyZWFkeVNlbGVjdGVkID0gdGhpcy5kLl9pc1NlbGVjdGVkKHNlbGVjdGVkRGF0ZSwgdGhpcy5kLmNlbGxUeXBlKTtcclxuXHJcbiAgICAgICAgICAgIGlmICghYWxyZWFkeVNlbGVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICBkcC5fdHJpZ2dlcignY2xpY2tDZWxsJywgc2VsZWN0ZWREYXRlKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZHAuX2hhbmRsZUFscmVhZHlTZWxlY3RlZERhdGVzLmJpbmQoZHAsIGFscmVhZHlTZWxlY3RlZCwgc2VsZWN0ZWREYXRlKSgpO1xyXG5cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfb25DbGlja0NlbGw6IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgIHZhciAkZWwgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCcuZGF0ZXBpY2tlci0tY2VsbCcpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCRlbC5oYXNDbGFzcygnLWRpc2FibGVkLScpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICB0aGlzLl9oYW5kbGVDbGljay5iaW5kKHRoaXMpKCRlbCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufSkoKTtcclxuIiwiOyhmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdGVtcGxhdGUgPSAnJyArXHJcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJkYXRlcGlja2VyLS1uYXYtYWN0aW9uXCIgZGF0YS1hY3Rpb249XCJwcmV2XCI+I3twcmV2SHRtbH08L2Rpdj4nICtcclxuICAgICAgICAnPGRpdiBjbGFzcz1cImRhdGVwaWNrZXItLW5hdi10aXRsZVwiPiN7dGl0bGV9PC9kaXY+JyArXHJcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJkYXRlcGlja2VyLS1uYXYtYWN0aW9uXCIgZGF0YS1hY3Rpb249XCJuZXh0XCI+I3tuZXh0SHRtbH08L2Rpdj4nLFxyXG4gICAgICAgIGJ1dHRvbnNDb250YWluZXJUZW1wbGF0ZSA9ICc8ZGl2IGNsYXNzPVwiZGF0ZXBpY2tlci0tYnV0dG9uc1wiPjwvZGl2PicsXHJcbiAgICAgICAgYnV0dG9uID0gJzxzcGFuIGNsYXNzPVwiZGF0ZXBpY2tlci0tYnV0dG9uXCIgZGF0YS1hY3Rpb249XCIje2FjdGlvbn1cIj4je2xhYmVsfTwvc3Bhbj4nLFxyXG4gICAgICAgIGRhdGVwaWNrZXIgPSAkLmZuLmRhdGVwaWNrZXIsXHJcbiAgICAgICAgZHAgPSBkYXRlcGlja2VyLkNvbnN0cnVjdG9yO1xyXG5cclxuICAgIGRhdGVwaWNrZXIuTmF2aWdhdGlvbiA9IGZ1bmN0aW9uIChkLCBvcHRzKSB7XHJcbiAgICAgICAgdGhpcy5kID0gZDtcclxuICAgICAgICB0aGlzLm9wdHMgPSBvcHRzO1xyXG5cclxuICAgICAgICB0aGlzLiRidXR0b25zQ29udGFpbmVyID0gJyc7XHJcblxyXG4gICAgICAgIHRoaXMuaW5pdCgpO1xyXG4gICAgfTtcclxuXHJcbiAgICBkYXRlcGlja2VyLk5hdmlnYXRpb24ucHJvdG90eXBlID0ge1xyXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGhpcy5fYnVpbGRCYXNlSHRtbCgpO1xyXG4gICAgICAgICAgICB0aGlzLl9iaW5kRXZlbnRzKCk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2JpbmRFdmVudHM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGhpcy5kLiRuYXYub24oJ2NsaWNrJywgJy5kYXRlcGlja2VyLS1uYXYtYWN0aW9uJywgJC5wcm94eSh0aGlzLl9vbkNsaWNrTmF2QnV0dG9uLCB0aGlzKSk7XHJcbiAgICAgICAgICAgIHRoaXMuZC4kbmF2Lm9uKCdjbGljaycsICcuZGF0ZXBpY2tlci0tbmF2LXRpdGxlJywgJC5wcm94eSh0aGlzLl9vbkNsaWNrTmF2VGl0bGUsIHRoaXMpKTtcclxuICAgICAgICAgICAgdGhpcy5kLiRkYXRlcGlja2VyLm9uKCdjbGljaycsICcuZGF0ZXBpY2tlci0tYnV0dG9uJywgJC5wcm94eSh0aGlzLl9vbkNsaWNrTmF2QnV0dG9uLCB0aGlzKSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2J1aWxkQmFzZUh0bWw6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLm9wdHMub25seVRpbWVwaWNrZXIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlcigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuX2FkZEJ1dHRvbnNJZk5lZWQoKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfYWRkQnV0dG9uc0lmTmVlZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRzLnRvZGF5QnV0dG9uKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9hZGRCdXR0b24oJ3RvZGF5JylcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRzLmNsZWFyQnV0dG9uKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9hZGRCdXR0b24oJ2NsZWFyJylcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9yZW5kZXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIHRpdGxlID0gdGhpcy5fZ2V0VGl0bGUodGhpcy5kLmN1cnJlbnREYXRlKSxcclxuICAgICAgICAgICAgICAgIGh0bWwgPSBkcC50ZW1wbGF0ZSh0ZW1wbGF0ZSwgJC5leHRlbmQoe3RpdGxlOiB0aXRsZX0sIHRoaXMub3B0cykpO1xyXG4gICAgICAgICAgICB0aGlzLmQuJG5hdi5odG1sKGh0bWwpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5kLnZpZXcgPT0gJ3llYXJzJykge1xyXG4gICAgICAgICAgICAgICAgJCgnLmRhdGVwaWNrZXItLW5hdi10aXRsZScsIHRoaXMuZC4kbmF2KS5hZGRDbGFzcygnLWRpc2FibGVkLScpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuc2V0TmF2U3RhdHVzKCk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2dldFRpdGxlOiBmdW5jdGlvbiAoZGF0ZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kLmZvcm1hdERhdGUodGhpcy5vcHRzLm5hdlRpdGxlc1t0aGlzLmQudmlld10sIGRhdGUpXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2FkZEJ1dHRvbjogZnVuY3Rpb24gKHR5cGUpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLiRidXR0b25zQ29udGFpbmVyLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fYWRkQnV0dG9uc0NvbnRhaW5lcigpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgZGF0YSA9IHtcclxuICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6IHRoaXMuZC5sb2NbdHlwZV1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBodG1sID0gZHAudGVtcGxhdGUoYnV0dG9uLCBkYXRhKTtcclxuXHJcbiAgICAgICAgICAgIGlmICgkKCdbZGF0YS1hY3Rpb249JyArIHR5cGUgKyAnXScsIHRoaXMuJGJ1dHRvbnNDb250YWluZXIpLmxlbmd0aCkgcmV0dXJuO1xyXG4gICAgICAgICAgICB0aGlzLiRidXR0b25zQ29udGFpbmVyLmFwcGVuZChodG1sKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfYWRkQnV0dG9uc0NvbnRhaW5lcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0aGlzLmQuJGRhdGVwaWNrZXIuYXBwZW5kKGJ1dHRvbnNDb250YWluZXJUZW1wbGF0ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuJGJ1dHRvbnNDb250YWluZXIgPSAkKCcuZGF0ZXBpY2tlci0tYnV0dG9ucycsIHRoaXMuZC4kZGF0ZXBpY2tlcik7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgc2V0TmF2U3RhdHVzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmICghKHRoaXMub3B0cy5taW5EYXRlIHx8IHRoaXMub3B0cy5tYXhEYXRlKSB8fCAhdGhpcy5vcHRzLmRpc2FibGVOYXZXaGVuT3V0T2ZSYW5nZSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgdmFyIGRhdGUgPSB0aGlzLmQucGFyc2VkRGF0ZSxcclxuICAgICAgICAgICAgICAgIG0gPSBkYXRlLm1vbnRoLFxyXG4gICAgICAgICAgICAgICAgeSA9IGRhdGUueWVhcixcclxuICAgICAgICAgICAgICAgIGQgPSBkYXRlLmRhdGU7XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuZC52aWV3KSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdkYXlzJzpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZC5faXNJblJhbmdlKG5ldyBEYXRlKHksIG0tMSwgMSksICdtb250aCcpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2Rpc2FibGVOYXYoJ3ByZXYnKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZC5faXNJblJhbmdlKG5ldyBEYXRlKHksIG0rMSwgMSksICdtb250aCcpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2Rpc2FibGVOYXYoJ25leHQnKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ21vbnRocyc6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmQuX2lzSW5SYW5nZShuZXcgRGF0ZSh5LTEsIG0sIGQpLCAneWVhcicpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2Rpc2FibGVOYXYoJ3ByZXYnKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZC5faXNJblJhbmdlKG5ldyBEYXRlKHkrMSwgbSwgZCksICd5ZWFyJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fZGlzYWJsZU5hdignbmV4dCcpXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAneWVhcnMnOlxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBkZWNhZGUgPSBkcC5nZXREZWNhZGUodGhpcy5kLmRhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5kLl9pc0luUmFuZ2UobmV3IERhdGUoZGVjYWRlWzBdIC0gMSwgMCwgMSksICd5ZWFyJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fZGlzYWJsZU5hdigncHJldicpXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5kLl9pc0luUmFuZ2UobmV3IERhdGUoZGVjYWRlWzFdICsgMSwgMCwgMSksICd5ZWFyJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fZGlzYWJsZU5hdignbmV4dCcpXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2Rpc2FibGVOYXY6IGZ1bmN0aW9uIChuYXYpIHtcclxuICAgICAgICAgICAgJCgnW2RhdGEtYWN0aW9uPVwiJyArIG5hdiArICdcIl0nLCB0aGlzLmQuJG5hdikuYWRkQ2xhc3MoJy1kaXNhYmxlZC0nKVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9hY3RpdmF0ZU5hdjogZnVuY3Rpb24gKG5hdikge1xyXG4gICAgICAgICAgICAkKCdbZGF0YS1hY3Rpb249XCInICsgbmF2ICsgJ1wiXScsIHRoaXMuZC4kbmF2KS5yZW1vdmVDbGFzcygnLWRpc2FibGVkLScpXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX29uQ2xpY2tOYXZCdXR0b246IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgIHZhciAkZWwgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdbZGF0YS1hY3Rpb25dJyksXHJcbiAgICAgICAgICAgICAgICBhY3Rpb24gPSAkZWwuZGF0YSgnYWN0aW9uJyk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmRbYWN0aW9uXSgpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9vbkNsaWNrTmF2VGl0bGU6IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgIGlmICgkKGUudGFyZ2V0KS5oYXNDbGFzcygnLWRpc2FibGVkLScpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5kLnZpZXcgPT0gJ2RheXMnKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kLnZpZXcgPSAnbW9udGhzJ1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmQudmlldyA9ICd5ZWFycyc7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxufSkoKTtcclxuIiwiOyhmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdGVtcGxhdGUgPSAnPGRpdiBjbGFzcz1cImRhdGVwaWNrZXItLXRpbWVcIj4nICtcclxuICAgICAgICAnPGRpdiBjbGFzcz1cImRhdGVwaWNrZXItLXRpbWUtY3VycmVudFwiPicgK1xyXG4gICAgICAgICcgICA8c3BhbiBjbGFzcz1cImRhdGVwaWNrZXItLXRpbWUtY3VycmVudC1ob3Vyc1wiPiN7aG91clZpc2libGV9PC9zcGFuPicgK1xyXG4gICAgICAgICcgICA8c3BhbiBjbGFzcz1cImRhdGVwaWNrZXItLXRpbWUtY3VycmVudC1jb2xvblwiPjo8L3NwYW4+JyArXHJcbiAgICAgICAgJyAgIDxzcGFuIGNsYXNzPVwiZGF0ZXBpY2tlci0tdGltZS1jdXJyZW50LW1pbnV0ZXNcIj4je21pblZhbHVlfTwvc3Bhbj4nICtcclxuICAgICAgICAnPC9kaXY+JyArXHJcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJkYXRlcGlja2VyLS10aW1lLXNsaWRlcnNcIj4nICtcclxuICAgICAgICAnICAgPGRpdiBjbGFzcz1cImRhdGVwaWNrZXItLXRpbWUtcm93XCI+JyArXHJcbiAgICAgICAgJyAgICAgIDxpbnB1dCB0eXBlPVwicmFuZ2VcIiBuYW1lPVwiaG91cnNcIiB2YWx1ZT1cIiN7aG91clZhbHVlfVwiIG1pbj1cIiN7aG91ck1pbn1cIiBtYXg9XCIje2hvdXJNYXh9XCIgc3RlcD1cIiN7aG91clN0ZXB9XCIvPicgK1xyXG4gICAgICAgICcgICA8L2Rpdj4nICtcclxuICAgICAgICAnICAgPGRpdiBjbGFzcz1cImRhdGVwaWNrZXItLXRpbWUtcm93XCI+JyArXHJcbiAgICAgICAgJyAgICAgIDxpbnB1dCB0eXBlPVwicmFuZ2VcIiBuYW1lPVwibWludXRlc1wiIHZhbHVlPVwiI3ttaW5WYWx1ZX1cIiBtaW49XCIje21pbk1pbn1cIiBtYXg9XCIje21pbk1heH1cIiBzdGVwPVwiI3ttaW5TdGVwfVwiLz4nICtcclxuICAgICAgICAnICAgPC9kaXY+JyArXHJcbiAgICAgICAgJzwvZGl2PicgK1xyXG4gICAgICAgICc8L2Rpdj4nLFxyXG4gICAgICAgIGRhdGVwaWNrZXIgPSAkLmZuLmRhdGVwaWNrZXIsXHJcbiAgICAgICAgZHAgPSBkYXRlcGlja2VyLkNvbnN0cnVjdG9yO1xyXG5cclxuICAgIGRhdGVwaWNrZXIuVGltZXBpY2tlciA9IGZ1bmN0aW9uIChpbnN0LCBvcHRzKSB7XHJcbiAgICAgICAgdGhpcy5kID0gaW5zdDtcclxuICAgICAgICB0aGlzLm9wdHMgPSBvcHRzO1xyXG5cclxuICAgICAgICB0aGlzLmluaXQoKTtcclxuICAgIH07XHJcblxyXG4gICAgZGF0ZXBpY2tlci5UaW1lcGlja2VyLnByb3RvdHlwZSA9IHtcclxuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHZhciBpbnB1dCA9ICdpbnB1dCc7XHJcbiAgICAgICAgICAgIHRoaXMuX3NldFRpbWUodGhpcy5kLmRhdGUpO1xyXG4gICAgICAgICAgICB0aGlzLl9idWlsZEhUTUwoKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC90cmlkZW50L2dpKSkge1xyXG4gICAgICAgICAgICAgICAgaW5wdXQgPSAnY2hhbmdlJztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5kLiRlbC5vbignc2VsZWN0RGF0ZScsIHRoaXMuX29uU2VsZWN0RGF0ZS5iaW5kKHRoaXMpKTtcclxuICAgICAgICAgICAgdGhpcy4kcmFuZ2VzLm9uKGlucHV0LCB0aGlzLl9vbkNoYW5nZVJhbmdlLmJpbmQodGhpcykpO1xyXG4gICAgICAgICAgICB0aGlzLiRyYW5nZXMub24oJ21vdXNldXAnLCB0aGlzLl9vbk1vdXNlVXBSYW5nZS5iaW5kKHRoaXMpKTtcclxuICAgICAgICAgICAgdGhpcy4kcmFuZ2VzLm9uKCdtb3VzZW1vdmUgZm9jdXMgJywgdGhpcy5fb25Nb3VzZUVudGVyUmFuZ2UuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgICAgIHRoaXMuJHJhbmdlcy5vbignbW91c2VvdXQgYmx1cicsIHRoaXMuX29uTW91c2VPdXRSYW5nZS5iaW5kKHRoaXMpKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfc2V0VGltZTogZnVuY3Rpb24gKGRhdGUpIHtcclxuICAgICAgICAgICAgdmFyIF9kYXRlID0gZHAuZ2V0UGFyc2VkRGF0ZShkYXRlKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuX2hhbmRsZURhdGUoZGF0ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuaG91cnMgPSBfZGF0ZS5ob3VycyA8IHRoaXMubWluSG91cnMgPyB0aGlzLm1pbkhvdXJzIDogX2RhdGUuaG91cnM7XHJcbiAgICAgICAgICAgIHRoaXMubWludXRlcyA9IF9kYXRlLm1pbnV0ZXMgPCB0aGlzLm1pbk1pbnV0ZXMgPyB0aGlzLm1pbk1pbnV0ZXMgOiBfZGF0ZS5taW51dGVzO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFNldHMgbWluSG91cnMgYW5kIG1pbk1pbnV0ZXMgZnJvbSBkYXRlICh1c3VhbGx5IGl0J3MgYSBtaW5EYXRlKVxyXG4gICAgICAgICAqIEFsc28gY2hhbmdlcyBtaW5NaW51dGVzIGlmIGN1cnJlbnQgaG91cnMgYXJlIGJpZ2dlciB0aGVuIEBkYXRlIGhvdXJzXHJcbiAgICAgICAgICogQHBhcmFtIGRhdGUge0RhdGV9XHJcbiAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgKi9cclxuICAgICAgICBfc2V0TWluVGltZUZyb21EYXRlOiBmdW5jdGlvbiAoZGF0ZSkge1xyXG4gICAgICAgICAgICB0aGlzLm1pbkhvdXJzID0gZGF0ZS5nZXRIb3VycygpO1xyXG4gICAgICAgICAgICB0aGlzLm1pbk1pbnV0ZXMgPSBkYXRlLmdldE1pbnV0ZXMoKTtcclxuXHJcbiAgICAgICAgICAgIC8vIElmLCBmb3IgZXhhbXBsZSwgbWluIGhvdXJzIGFyZSAxMCwgYW5kIGN1cnJlbnQgaG91cnMgYXJlIDEyLFxyXG4gICAgICAgICAgICAvLyB1cGRhdGUgbWluTWludXRlcyB0byBkZWZhdWx0IHZhbHVlLCB0byBiZSBhYmxlIHRvIGNob29zZSB3aG9sZSByYW5nZSBvZiB2YWx1ZXNcclxuICAgICAgICAgICAgaWYgKHRoaXMuZC5sYXN0U2VsZWN0ZWREYXRlKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kLmxhc3RTZWxlY3RlZERhdGUuZ2V0SG91cnMoKSA+IGRhdGUuZ2V0SG91cnMoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWluTWludXRlcyA9IHRoaXMub3B0cy5taW5NaW51dGVzO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX3NldE1heFRpbWVGcm9tRGF0ZTogZnVuY3Rpb24gKGRhdGUpIHtcclxuICAgICAgICAgICAgdGhpcy5tYXhIb3VycyA9IGRhdGUuZ2V0SG91cnMoKTtcclxuICAgICAgICAgICAgdGhpcy5tYXhNaW51dGVzID0gZGF0ZS5nZXRNaW51dGVzKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5kLmxhc3RTZWxlY3RlZERhdGUpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmQubGFzdFNlbGVjdGVkRGF0ZS5nZXRIb3VycygpIDwgZGF0ZS5nZXRIb3VycygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tYXhNaW51dGVzID0gdGhpcy5vcHRzLm1heE1pbnV0ZXM7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfc2V0RGVmYXVsdE1pbk1heFRpbWU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIG1heEhvdXJzID0gMjMsXHJcbiAgICAgICAgICAgICAgICBtYXhNaW51dGVzID0gNTksXHJcbiAgICAgICAgICAgICAgICBvcHRzID0gdGhpcy5vcHRzO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5taW5Ib3VycyA9IG9wdHMubWluSG91cnMgPCAwIHx8IG9wdHMubWluSG91cnMgPiBtYXhIb3VycyA/IDAgOiBvcHRzLm1pbkhvdXJzO1xyXG4gICAgICAgICAgICB0aGlzLm1pbk1pbnV0ZXMgPSBvcHRzLm1pbk1pbnV0ZXMgPCAwIHx8IG9wdHMubWluTWludXRlcyA+IG1heE1pbnV0ZXMgPyAwIDogb3B0cy5taW5NaW51dGVzO1xyXG4gICAgICAgICAgICB0aGlzLm1heEhvdXJzID0gb3B0cy5tYXhIb3VycyA8IDAgfHwgb3B0cy5tYXhIb3VycyA+IG1heEhvdXJzID8gbWF4SG91cnMgOiBvcHRzLm1heEhvdXJzO1xyXG4gICAgICAgICAgICB0aGlzLm1heE1pbnV0ZXMgPSBvcHRzLm1heE1pbnV0ZXMgPCAwIHx8IG9wdHMubWF4TWludXRlcyA+IG1heE1pbnV0ZXMgPyBtYXhNaW51dGVzIDogb3B0cy5tYXhNaW51dGVzO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIExvb2tzIGZvciBtaW4vbWF4IGhvdXJzL21pbnV0ZXMgYW5kIGlmIGN1cnJlbnQgdmFsdWVzXHJcbiAgICAgICAgICogYXJlIG91dCBvZiByYW5nZSBzZXRzIHZhbGlkIHZhbHVlcy5cclxuICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIF92YWxpZGF0ZUhvdXJzTWludXRlczogZnVuY3Rpb24gKGRhdGUpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaG91cnMgPCB0aGlzLm1pbkhvdXJzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhvdXJzID0gdGhpcy5taW5Ib3VycztcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmhvdXJzID4gdGhpcy5tYXhIb3Vycykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ob3VycyA9IHRoaXMubWF4SG91cnM7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm1pbnV0ZXMgPCB0aGlzLm1pbk1pbnV0ZXMpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWludXRlcyA9IHRoaXMubWluTWludXRlcztcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLm1pbnV0ZXMgPiB0aGlzLm1heE1pbnV0ZXMpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWludXRlcyA9IHRoaXMubWF4TWludXRlcztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9idWlsZEhUTUw6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIGx6ID0gZHAuZ2V0TGVhZGluZ1plcm9OdW0sXHJcbiAgICAgICAgICAgICAgICBkYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGhvdXJNaW46IHRoaXMubWluSG91cnMsXHJcbiAgICAgICAgICAgICAgICAgICAgaG91ck1heDogbHoodGhpcy5tYXhIb3VycyksXHJcbiAgICAgICAgICAgICAgICAgICAgaG91clN0ZXA6IHRoaXMub3B0cy5ob3Vyc1N0ZXAsXHJcbiAgICAgICAgICAgICAgICAgICAgaG91clZhbHVlOiB0aGlzLmhvdXJzLFxyXG4gICAgICAgICAgICAgICAgICAgIGhvdXJWaXNpYmxlOiBseih0aGlzLmRpc3BsYXlIb3VycyksXHJcbiAgICAgICAgICAgICAgICAgICAgbWluTWluOiB0aGlzLm1pbk1pbnV0ZXMsXHJcbiAgICAgICAgICAgICAgICAgICAgbWluTWF4OiBseih0aGlzLm1heE1pbnV0ZXMpLFxyXG4gICAgICAgICAgICAgICAgICAgIG1pblN0ZXA6IHRoaXMub3B0cy5taW51dGVzU3RlcCxcclxuICAgICAgICAgICAgICAgICAgICBtaW5WYWx1ZTogbHoodGhpcy5taW51dGVzKVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIF90ZW1wbGF0ZSA9IGRwLnRlbXBsYXRlKHRlbXBsYXRlLCBkYXRhKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuJHRpbWVwaWNrZXIgPSAkKF90ZW1wbGF0ZSkuYXBwZW5kVG8odGhpcy5kLiRkYXRlcGlja2VyKTtcclxuICAgICAgICAgICAgdGhpcy4kcmFuZ2VzID0gJCgnW3R5cGU9XCJyYW5nZVwiXScsIHRoaXMuJHRpbWVwaWNrZXIpO1xyXG4gICAgICAgICAgICB0aGlzLiRob3VycyA9ICQoJ1tuYW1lPVwiaG91cnNcIl0nLCB0aGlzLiR0aW1lcGlja2VyKTtcclxuICAgICAgICAgICAgdGhpcy4kbWludXRlcyA9ICQoJ1tuYW1lPVwibWludXRlc1wiXScsIHRoaXMuJHRpbWVwaWNrZXIpO1xyXG4gICAgICAgICAgICB0aGlzLiRob3Vyc1RleHQgPSAkKCcuZGF0ZXBpY2tlci0tdGltZS1jdXJyZW50LWhvdXJzJywgdGhpcy4kdGltZXBpY2tlcik7XHJcbiAgICAgICAgICAgIHRoaXMuJG1pbnV0ZXNUZXh0ID0gJCgnLmRhdGVwaWNrZXItLXRpbWUtY3VycmVudC1taW51dGVzJywgdGhpcy4kdGltZXBpY2tlcik7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5kLmFtcG0pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGFtcG0gPSAkKCc8c3BhbiBjbGFzcz1cImRhdGVwaWNrZXItLXRpbWUtY3VycmVudC1hbXBtXCI+JylcclxuICAgICAgICAgICAgICAgICAgICAuYXBwZW5kVG8oJCgnLmRhdGVwaWNrZXItLXRpbWUtY3VycmVudCcsIHRoaXMuJHRpbWVwaWNrZXIpKVxyXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKHRoaXMuZGF5UGVyaW9kKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLiR0aW1lcGlja2VyLmFkZENsYXNzKCctYW0tcG0tJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfdXBkYXRlQ3VycmVudFRpbWU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIGggPSAgZHAuZ2V0TGVhZGluZ1plcm9OdW0odGhpcy5kaXNwbGF5SG91cnMpLFxyXG4gICAgICAgICAgICAgICAgbSA9IGRwLmdldExlYWRpbmdaZXJvTnVtKHRoaXMubWludXRlcyk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLiRob3Vyc1RleHQuaHRtbChoKTtcclxuICAgICAgICAgICAgdGhpcy4kbWludXRlc1RleHQuaHRtbChtKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmQuYW1wbSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kYW1wbS5odG1sKHRoaXMuZGF5UGVyaW9kKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF91cGRhdGVSYW5nZXM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGhpcy4kaG91cnMuYXR0cih7XHJcbiAgICAgICAgICAgICAgICBtaW46IHRoaXMubWluSG91cnMsXHJcbiAgICAgICAgICAgICAgICBtYXg6IHRoaXMubWF4SG91cnNcclxuICAgICAgICAgICAgfSkudmFsKHRoaXMuaG91cnMpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy4kbWludXRlcy5hdHRyKHtcclxuICAgICAgICAgICAgICAgIG1pbjogdGhpcy5taW5NaW51dGVzLFxyXG4gICAgICAgICAgICAgICAgbWF4OiB0aGlzLm1heE1pbnV0ZXNcclxuICAgICAgICAgICAgfSkudmFsKHRoaXMubWludXRlcylcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBTZXRzIG1pbkhvdXJzLCBtaW5NaW51dGVzIGV0Yy4gZnJvbSBkYXRlLiBJZiBkYXRlIGlzIG5vdCBwYXNzZWQsIHRoYW4gc2V0c1xyXG4gICAgICAgICAqIHZhbHVlcyBmcm9tIG9wdGlvbnNcclxuICAgICAgICAgKiBAcGFyYW0gW2RhdGVdIHtvYmplY3R9IC0gRGF0ZSBvYmplY3QsIHRvIGdldCB2YWx1ZXMgZnJvbVxyXG4gICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgX2hhbmRsZURhdGU6IGZ1bmN0aW9uIChkYXRlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX3NldERlZmF1bHRNaW5NYXhUaW1lKCk7XHJcbiAgICAgICAgICAgIGlmIChkYXRlKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZHAuaXNTYW1lKGRhdGUsIHRoaXMuZC5vcHRzLm1pbkRhdGUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2V0TWluVGltZUZyb21EYXRlKHRoaXMuZC5vcHRzLm1pbkRhdGUpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChkcC5pc1NhbWUoZGF0ZSwgdGhpcy5kLm9wdHMubWF4RGF0ZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9zZXRNYXhUaW1lRnJvbURhdGUodGhpcy5kLm9wdHMubWF4RGF0ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuX3ZhbGlkYXRlSG91cnNNaW51dGVzKGRhdGUpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHVwZGF0ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0aGlzLl91cGRhdGVSYW5nZXMoKTtcclxuICAgICAgICAgICAgdGhpcy5fdXBkYXRlQ3VycmVudFRpbWUoKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDYWxjdWxhdGVzIHZhbGlkIGhvdXIgdmFsdWUgdG8gZGlzcGxheSBpbiB0ZXh0IGlucHV0IGFuZCBkYXRlcGlja2VyJ3MgYm9keS5cclxuICAgICAgICAgKiBAcGFyYW0gZGF0ZSB7RGF0ZXxOdW1iZXJ9IC0gZGF0ZSBvciBob3Vyc1xyXG4gICAgICAgICAqIEBwYXJhbSBbYW1wbV0ge0Jvb2xlYW59IC0gMTIgaG91cnMgbW9kZVxyXG4gICAgICAgICAqIEByZXR1cm5zIHt7aG91cnM6ICosIGRheVBlcmlvZDogc3RyaW5nfX1cclxuICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIF9nZXRWYWxpZEhvdXJzRnJvbURhdGU6IGZ1bmN0aW9uIChkYXRlLCBhbXBtKSB7XHJcbiAgICAgICAgICAgIHZhciBkID0gZGF0ZSxcclxuICAgICAgICAgICAgICAgIGhvdXJzID0gZGF0ZTtcclxuXHJcbiAgICAgICAgICAgIGlmIChkYXRlIGluc3RhbmNlb2YgRGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgZCA9IGRwLmdldFBhcnNlZERhdGUoZGF0ZSk7XHJcbiAgICAgICAgICAgICAgICBob3VycyA9IGQuaG91cnM7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBfYW1wbSA9IGFtcG0gfHwgdGhpcy5kLmFtcG0sXHJcbiAgICAgICAgICAgICAgICBkYXlQZXJpb2QgPSAnYW0nO1xyXG5cclxuICAgICAgICAgICAgaWYgKF9hbXBtKSB7XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2godHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgaG91cnMgPT0gMDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgaG91cnMgPSAxMjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBob3VycyA9PSAxMjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF5UGVyaW9kID0gJ3BtJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBob3VycyA+IDExOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBob3VycyA9IGhvdXJzIC0gMTI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRheVBlcmlvZCA9ICdwbSc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgaG91cnM6IGhvdXJzLFxyXG4gICAgICAgICAgICAgICAgZGF5UGVyaW9kOiBkYXlQZXJpb2RcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHNldCBob3VycyAodmFsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2hvdXJzID0gdmFsO1xyXG5cclxuICAgICAgICAgICAgdmFyIGRpc3BsYXlIb3VycyA9IHRoaXMuX2dldFZhbGlkSG91cnNGcm9tRGF0ZSh2YWwpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5kaXNwbGF5SG91cnMgPSBkaXNwbGF5SG91cnMuaG91cnM7XHJcbiAgICAgICAgICAgIHRoaXMuZGF5UGVyaW9kID0gZGlzcGxheUhvdXJzLmRheVBlcmlvZDtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBnZXQgaG91cnMoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9ob3VycztcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvLyAgRXZlbnRzXHJcbiAgICAgICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgICAgICBfb25DaGFuZ2VSYW5nZTogZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgdmFyICR0YXJnZXQgPSAkKGUudGFyZ2V0KSxcclxuICAgICAgICAgICAgICAgIG5hbWUgPSAkdGFyZ2V0LmF0dHIoJ25hbWUnKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHRoaXMuZC50aW1lcGlja2VySXNBY3RpdmUgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgdGhpc1tuYW1lXSA9ICR0YXJnZXQudmFsKCk7XHJcbiAgICAgICAgICAgIHRoaXMuX3VwZGF0ZUN1cnJlbnRUaW1lKCk7XHJcbiAgICAgICAgICAgIHRoaXMuZC5fdHJpZ2dlcigndGltZUNoYW5nZScsIFt0aGlzLmhvdXJzLCB0aGlzLm1pbnV0ZXNdKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuX2hhbmRsZURhdGUodGhpcy5kLmxhc3RTZWxlY3RlZERhdGUpO1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZSgpXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX29uU2VsZWN0RGF0ZTogZnVuY3Rpb24gKGUsIGRhdGEpIHtcclxuICAgICAgICAgICAgdGhpcy5faGFuZGxlRGF0ZShkYXRhKTtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGUoKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfb25Nb3VzZUVudGVyUmFuZ2U6IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgIHZhciBuYW1lID0gJChlLnRhcmdldCkuYXR0cignbmFtZScpO1xyXG4gICAgICAgICAgICAkKCcuZGF0ZXBpY2tlci0tdGltZS1jdXJyZW50LScgKyBuYW1lLCB0aGlzLiR0aW1lcGlja2VyKS5hZGRDbGFzcygnLWZvY3VzLScpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9vbk1vdXNlT3V0UmFuZ2U6IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgIHZhciBuYW1lID0gJChlLnRhcmdldCkuYXR0cignbmFtZScpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5kLmluRm9jdXMpIHJldHVybjsgLy8gUHJldmVudCByZW1vdmluZyBmb2N1cyB3aGVuIG1vdXNlIG91dCBvZiByYW5nZSBzbGlkZXJcclxuICAgICAgICAgICAgJCgnLmRhdGVwaWNrZXItLXRpbWUtY3VycmVudC0nICsgbmFtZSwgdGhpcy4kdGltZXBpY2tlcikucmVtb3ZlQ2xhc3MoJy1mb2N1cy0nKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfb25Nb3VzZVVwUmFuZ2U6IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZC50aW1lcGlja2VySXNBY3RpdmUgPSBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59KSgpO1xyXG4iXX0=
