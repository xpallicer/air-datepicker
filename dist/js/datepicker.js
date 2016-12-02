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

            this._loopParts(this.views[this.currentView], $.fn.datepicker.Body, this, this.currentView, this.opts)
            this._looper(this.views[this.currentView], 'show');


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

        _loopParts: function (arr, object) {
            var i = 0,
                args = [].slice.call(arguments, 1);


            // Push initial index
            args.push(0);

            while(i < this.opts.calendars) {
                args[args.length - 1] = i;
                var F = object.bind.apply(object, args);
                arr.push(new F());
                i++;
            }
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
                    this.views[val] = [];
                    this._loopParts(this.views[val], $.fn.datepicker.Body, this, val, this.opts);
                } else {
                    this._looper(this.views[val], '_render');
                }

                this._looper(this.views[this.prevView], 'hide');
                this._looper(this.views[val], 'show');
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
                    var decade = this.localDecade;
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
         * @param {object} date - parsed local view date
         * @returns {string}
         * @private
         */
        _getMonthsHtml: function (date) {
            var html = '',
                i = 0;

            while(i < 12) {
                html += this._getMonthHtml(new Date(date.year, i));
                i++
            }

            return html;
        },

        _getMonthHtml: function (date) {
            var content = this._getCellContents(date, 'month');

            return '<div class="' + content.classes + '" data-month="' + date.getMonth() + '">' + content.html + '</div>'
        },

        /**
         * Calculates years view html
         * @param {Object} localDate - parsed local view date
         * @returns {string}
         * @private
         */
        _getYearsHtml: function (localDate) {
            var decade = dp.getDecade(new Date(localDate.year, localDate.month, 1)),
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
                var html = this._getMonthsHtml(this.localViewDate);

                this.$cells.html(html)
            },
            years: function () {
                var html = this._getYearsHtml(this.localViewDate);

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
                index = this.index,
                date;

            switch (this.type) {
                case  'days':
                    date = dp.getParsedDate(new Date(viewDate.year, viewDate.month + index, viewDate.date));
                    break;
                case 'months':
                    date = dp.getParsedDate(new Date(viewDate.year + index, 0, 1));
                    break;
                case 'years':
                    date = dp.getParsedDate(new Date(viewDate.year + 10 * index, viewDate.month + index, viewDate.date));
                    break
            }

            return date
        },

        get localDecade(){
            return dp.getDecade(new Date(this.localViewDate.year, 0))
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRhdGVwaWNrZXIuanMiLCJib2R5LmpzIiwibmF2aWdhdGlvbi5qcyIsInRpbWVwaWNrZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZnREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDclZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJkYXRlcGlja2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiOyhmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgVkVSU0lPTiA9ICcyLjIuMicsXHJcbiAgICAgICAgcGx1Z2luTmFtZSA9ICdkYXRlcGlja2VyJyxcclxuICAgICAgICBhdXRvSW5pdFNlbGVjdG9yID0gJy5kYXRlcGlja2VyLWhlcmUnLFxyXG4gICAgICAgICRib2R5LCAkZGF0ZXBpY2tlcnNDb250YWluZXIsXHJcbiAgICAgICAgY29udGFpbmVyQnVpbHQgPSBmYWxzZSxcclxuICAgICAgICBiYXNlVGVtcGxhdGUgPSAnJyArXHJcbiAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiZGF0ZXBpY2tlclwiPicgK1xyXG4gICAgICAgICAgICAnPGkgY2xhc3M9XCJkYXRlcGlja2VyLS1wb2ludGVyXCI+PC9pPicgK1xyXG4gICAgICAgICAgICAnPG5hdiBjbGFzcz1cImRhdGVwaWNrZXItLW5hdlwiPjwvbmF2PicgK1xyXG4gICAgICAgICAgICAnPGRpdiBjbGFzcz1cImRhdGVwaWNrZXItLWNvbnRlbnRcIj48L2Rpdj4nICtcclxuICAgICAgICAgICAgJzwvZGl2PicsXHJcbiAgICAgICAgZGVmYXVsdHMgPSB7XHJcbiAgICAgICAgICAgIGNsYXNzZXM6ICcnLFxyXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxyXG4gICAgICAgICAgICBsYW5ndWFnZTogJ3J1JyxcclxuICAgICAgICAgICAgc3RhcnREYXRlOiBuZXcgRGF0ZSgpLFxyXG4gICAgICAgICAgICBmaXJzdERheTogJycsXHJcbiAgICAgICAgICAgIHdlZWtlbmRzOiBbNiwgMF0sXHJcbiAgICAgICAgICAgIGRhdGVGb3JtYXQ6ICcnLFxyXG4gICAgICAgICAgICBhbHRGaWVsZDogJycsXHJcbiAgICAgICAgICAgIGFsdEZpZWxkRGF0ZUZvcm1hdDogJ0AnLFxyXG4gICAgICAgICAgICB0b2dnbGVTZWxlY3RlZDogdHJ1ZSxcclxuICAgICAgICAgICAga2V5Ym9hcmROYXY6IHRydWUsXHJcblxyXG4gICAgICAgICAgICBjYWxlbmRhcnM6IDEsXHJcblxyXG5cclxuICAgICAgICAgICAgcG9zaXRpb246ICdib3R0b20gbGVmdCcsXHJcbiAgICAgICAgICAgIG9mZnNldDogMTIsXHJcblxyXG4gICAgICAgICAgICB2aWV3OiAnZGF5cycsXHJcbiAgICAgICAgICAgIG1pblZpZXc6ICdkYXlzJyxcclxuXHJcbiAgICAgICAgICAgIHNob3dPdGhlck1vbnRoczogdHJ1ZSxcclxuICAgICAgICAgICAgc2VsZWN0T3RoZXJNb250aHM6IHRydWUsXHJcbiAgICAgICAgICAgIG1vdmVUb090aGVyTW9udGhzT25TZWxlY3Q6IHRydWUsXHJcblxyXG4gICAgICAgICAgICBzaG93T3RoZXJZZWFyczogdHJ1ZSxcclxuICAgICAgICAgICAgc2VsZWN0T3RoZXJZZWFyczogdHJ1ZSxcclxuICAgICAgICAgICAgbW92ZVRvT3RoZXJZZWFyc09uU2VsZWN0OiB0cnVlLFxyXG5cclxuICAgICAgICAgICAgbWluRGF0ZTogJycsXHJcbiAgICAgICAgICAgIG1heERhdGU6ICcnLFxyXG4gICAgICAgICAgICBkaXNhYmxlTmF2V2hlbk91dE9mUmFuZ2U6IHRydWUsXHJcblxyXG4gICAgICAgICAgICBtdWx0aXBsZURhdGVzOiBmYWxzZSwgLy8gQm9vbGVhbiBvciBOdW1iZXJcclxuICAgICAgICAgICAgbXVsdGlwbGVEYXRlc1NlcGFyYXRvcjogJywnLFxyXG4gICAgICAgICAgICByYW5nZTogZmFsc2UsXHJcblxyXG4gICAgICAgICAgICB0b2RheUJ1dHRvbjogZmFsc2UsXHJcbiAgICAgICAgICAgIGNsZWFyQnV0dG9uOiBmYWxzZSxcclxuXHJcbiAgICAgICAgICAgIHNob3dFdmVudDogJ2ZvY3VzJyxcclxuICAgICAgICAgICAgYXV0b0Nsb3NlOiBmYWxzZSxcclxuXHJcbiAgICAgICAgICAgIC8vIG5hdmlnYXRpb25cclxuICAgICAgICAgICAgbW9udGhzRmllbGQ6ICdtb250aHNTaG9ydCcsXHJcbiAgICAgICAgICAgIHByZXZIdG1sOiAnPHN2Zz48cGF0aCBkPVwiTSAxNywxMiBsIC01LDUgbCA1LDVcIj48L3BhdGg+PC9zdmc+JyxcclxuICAgICAgICAgICAgbmV4dEh0bWw6ICc8c3ZnPjxwYXRoIGQ9XCJNIDE0LDEyIGwgNSw1IGwgLTUsNVwiPjwvcGF0aD48L3N2Zz4nLFxyXG4gICAgICAgICAgICBuYXZUaXRsZXM6IHtcclxuICAgICAgICAgICAgICAgIGRheXM6ICdNTSwgPGk+eXl5eTwvaT4nLFxyXG4gICAgICAgICAgICAgICAgbW9udGhzOiAneXl5eScsXHJcbiAgICAgICAgICAgICAgICB5ZWFyczogJ3l5eXkxIC0geXl5eTInXHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvLyB0aW1lcGlja2VyXHJcbiAgICAgICAgICAgIHRpbWVwaWNrZXI6IGZhbHNlLFxyXG4gICAgICAgICAgICBvbmx5VGltZXBpY2tlcjogZmFsc2UsXHJcbiAgICAgICAgICAgIGRhdGVUaW1lU2VwYXJhdG9yOiAnICcsXHJcbiAgICAgICAgICAgIHRpbWVGb3JtYXQ6ICcnLFxyXG4gICAgICAgICAgICBtaW5Ib3VyczogMCxcclxuICAgICAgICAgICAgbWF4SG91cnM6IDI0LFxyXG4gICAgICAgICAgICBtaW5NaW51dGVzOiAwLFxyXG4gICAgICAgICAgICBtYXhNaW51dGVzOiA1OSxcclxuICAgICAgICAgICAgaG91cnNTdGVwOiAxLFxyXG4gICAgICAgICAgICBtaW51dGVzU3RlcDogMSxcclxuXHJcbiAgICAgICAgICAgIC8vIGV2ZW50c1xyXG4gICAgICAgICAgICBvblNlbGVjdDogJycsXHJcbiAgICAgICAgICAgIG9uU2hvdzogJycsXHJcbiAgICAgICAgICAgIG9uSGlkZTogJycsXHJcbiAgICAgICAgICAgIG9uQ2hhbmdlTW9udGg6ICcnLFxyXG4gICAgICAgICAgICBvbkNoYW5nZVllYXI6ICcnLFxyXG4gICAgICAgICAgICBvbkNoYW5nZURlY2FkZTogJycsXHJcbiAgICAgICAgICAgIG9uQ2hhbmdlVmlldzogJycsXHJcbiAgICAgICAgICAgIG9uUmVuZGVyQ2VsbDogJydcclxuICAgICAgICB9LFxyXG4gICAgICAgIGhvdEtleXMgPSB7XHJcbiAgICAgICAgICAgICdjdHJsUmlnaHQnOiBbMTcsIDM5XSxcclxuICAgICAgICAgICAgJ2N0cmxVcCc6IFsxNywgMzhdLFxyXG4gICAgICAgICAgICAnY3RybExlZnQnOiBbMTcsIDM3XSxcclxuICAgICAgICAgICAgJ2N0cmxEb3duJzogWzE3LCA0MF0sXHJcbiAgICAgICAgICAgICdzaGlmdFJpZ2h0JzogWzE2LCAzOV0sXHJcbiAgICAgICAgICAgICdzaGlmdFVwJzogWzE2LCAzOF0sXHJcbiAgICAgICAgICAgICdzaGlmdExlZnQnOiBbMTYsIDM3XSxcclxuICAgICAgICAgICAgJ3NoaWZ0RG93bic6IFsxNiwgNDBdLFxyXG4gICAgICAgICAgICAnYWx0VXAnOiBbMTgsIDM4XSxcclxuICAgICAgICAgICAgJ2FsdFJpZ2h0JzogWzE4LCAzOV0sXHJcbiAgICAgICAgICAgICdhbHRMZWZ0JzogWzE4LCAzN10sXHJcbiAgICAgICAgICAgICdhbHREb3duJzogWzE4LCA0MF0sXHJcbiAgICAgICAgICAgICdjdHJsU2hpZnRVcCc6IFsxNiwgMTcsIDM4XVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZGF0ZXBpY2tlcjtcclxuXHJcbiAgICB2YXIgRGF0ZXBpY2tlciAgPSBmdW5jdGlvbiAoZWwsIG9wdGlvbnMpIHtcclxuICAgICAgICB0aGlzLmVsID0gZWw7XHJcbiAgICAgICAgdGhpcy4kZWwgPSAkKGVsKTtcclxuXHJcbiAgICAgICAgdGhpcy5vcHRzID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBvcHRpb25zLCB0aGlzLiRlbC5kYXRhKCkpO1xyXG5cclxuICAgICAgICBpZiAoJGJvZHkgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICRib2R5ID0gJCgnYm9keScpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLm9wdHMuc3RhcnREYXRlKSB7XHJcbiAgICAgICAgICAgIHRoaXMub3B0cy5zdGFydERhdGUgPSBuZXcgRGF0ZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuZWwubm9kZU5hbWUgPT0gJ0lOUFVUJykge1xyXG4gICAgICAgICAgICB0aGlzLmVsSXNJbnB1dCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5vcHRzLmFsdEZpZWxkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGFsdEZpZWxkID0gdHlwZW9mIHRoaXMub3B0cy5hbHRGaWVsZCA9PSAnc3RyaW5nJyA/ICQodGhpcy5vcHRzLmFsdEZpZWxkKSA6IHRoaXMub3B0cy5hbHRGaWVsZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLm9wdHMuY2FsZW5kYXJzID4gMSkge1xyXG4gICAgICAgICAgICAgdGhpcy5vcHRzLnNob3dPdGhlck1vbnRocyA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5pbml0ZWQgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLnNpbGVudCA9IGZhbHNlOyAvLyBOZWVkIHRvIHByZXZlbnQgdW5uZWNlc3NhcnkgcmVuZGVyaW5nXHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudERhdGUgPSB0aGlzLm9wdHMuc3RhcnREYXRlO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFZpZXcgPSB0aGlzLm9wdHMudmlldztcclxuICAgICAgICB0aGlzLl9jcmVhdGVTaG9ydEN1dHMoKTtcclxuICAgICAgICB0aGlzLnNlbGVjdGVkRGF0ZXMgPSBbXTtcclxuICAgICAgICB0aGlzLnZpZXdzID0ge307XHJcbiAgICAgICAgdGhpcy5rZXlzID0gW107XHJcbiAgICAgICAgdGhpcy5taW5SYW5nZSA9ICcnO1xyXG4gICAgICAgIHRoaXMubWF4UmFuZ2UgPSAnJztcclxuICAgICAgICB0aGlzLl9wcmV2T25TZWxlY3RWYWx1ZSA9ICcnO1xyXG5cclxuICAgICAgICB0aGlzLmluaXQoKVxyXG4gICAgfTtcclxuXHJcbiAgICBkYXRlcGlja2VyID0gRGF0ZXBpY2tlcjtcclxuXHJcbiAgICBkYXRlcGlja2VyLnByb3RvdHlwZSA9IHtcclxuICAgICAgICBWRVJTSU9OOiBWRVJTSU9OLFxyXG4gICAgICAgIHZpZXdJbmRleGVzOiBbJ2RheXMnLCAnbW9udGhzJywgJ3llYXJzJ10sXHJcblxyXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKCFjb250YWluZXJCdWlsdCAmJiAhdGhpcy5vcHRzLmlubGluZSAmJiB0aGlzLmVsSXNJbnB1dCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fYnVpbGREYXRlcGlja2Vyc0NvbnRhaW5lcigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuX2J1aWxkQmFzZUh0bWwoKTtcclxuICAgICAgICAgICAgdGhpcy5fZGVmaW5lTG9jYWxlKHRoaXMub3B0cy5sYW5ndWFnZSk7XHJcbiAgICAgICAgICAgIHRoaXMuX3N5bmNXaXRoTWluTWF4RGF0ZXMoKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmVsSXNJbnB1dCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLm9wdHMuaW5saW5lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IGV4dHJhIGNsYXNzZXMgZm9yIHByb3BlciB0cmFuc2l0aW9uc1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3NldFBvc2l0aW9uQ2xhc3Nlcyh0aGlzLm9wdHMucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2JpbmRFdmVudHMoKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub3B0cy5rZXlib2FyZE5hdiAmJiAhdGhpcy5vcHRzLm9ubHlUaW1lcGlja2VyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fYmluZEtleWJvYXJkRXZlbnRzKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRkYXRlcGlja2VyLm9uKCdtb3VzZWRvd24nLCB0aGlzLl9vbk1vdXNlRG93bkRhdGVwaWNrZXIuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRkYXRlcGlja2VyLm9uKCdtb3VzZXVwJywgdGhpcy5fb25Nb3VzZVVwRGF0ZXBpY2tlci5iaW5kKHRoaXMpKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMub3B0cy5jbGFzc2VzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRkYXRlcGlja2VyLmFkZENsYXNzKHRoaXMub3B0cy5jbGFzc2VzKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRzLnRpbWVwaWNrZXIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGltZXBpY2tlciA9IG5ldyAkLmZuLmRhdGVwaWNrZXIuVGltZXBpY2tlcih0aGlzLCB0aGlzLm9wdHMpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fYmluZFRpbWVwaWNrZXJFdmVudHMoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMub3B0cy5vbmx5VGltZXBpY2tlcikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kZGF0ZXBpY2tlci5hZGRDbGFzcygnLW9ubHktdGltZXBpY2tlci0nKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMub3B0cy5jYWxlbmRhcnMgPiAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRkYXRlcGlja2VyLmFkZENsYXNzKCctbXVsdGlwbGUtY2Fscy0nKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdmFyIGkgPSAwO1xyXG5cclxuICAgICAgICAgICAgdGhpcy52aWV3c1t0aGlzLmN1cnJlbnRWaWV3XSA9IFtdO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5fbG9vcFBhcnRzKHRoaXMudmlld3NbdGhpcy5jdXJyZW50Vmlld10sICQuZm4uZGF0ZXBpY2tlci5Cb2R5LCB0aGlzLCB0aGlzLmN1cnJlbnRWaWV3LCB0aGlzLm9wdHMpXHJcbiAgICAgICAgICAgIHRoaXMuX2xvb3Blcih0aGlzLnZpZXdzW3RoaXMuY3VycmVudFZpZXddLCAnc2hvdycpO1xyXG5cclxuXHJcbiAgICAgICAgICAgIC8vIHRoaXMudmlld3NbdGhpcy5jdXJyZW50Vmlld10gPSBuZXcgJC5mbi5kYXRlcGlja2VyLkJvZHkodGhpcywgdGhpcy5jdXJyZW50VmlldywgdGhpcy5vcHRzKTtcclxuICAgICAgICAgICAgLy8gdGhpcy52aWV3c1t0aGlzLmN1cnJlbnRWaWV3XS5zaG93KCk7XHJcblxyXG5cclxuXHJcbiAgICAgICAgICAgIHRoaXMubmF2ID0gbmV3ICQuZm4uZGF0ZXBpY2tlci5OYXZpZ2F0aW9uKHRoaXMsIHRoaXMub3B0cyk7XHJcbiAgICAgICAgICAgIHRoaXMudmlldyA9IHRoaXMuY3VycmVudFZpZXc7XHJcblxyXG4gICAgICAgICAgICB0aGlzLiRlbC5vbignY2xpY2tDZWxsLmFkcCcsIHRoaXMuX29uQ2xpY2tDZWxsLmJpbmQodGhpcykpO1xyXG4gICAgICAgICAgICB0aGlzLiRkYXRlcGlja2VyLm9uKCdtb3VzZWVudGVyJywgJy5kYXRlcGlja2VyLS1jZWxsJywgdGhpcy5fb25Nb3VzZUVudGVyQ2VsbC5iaW5kKHRoaXMpKTtcclxuICAgICAgICAgICAgdGhpcy4kZGF0ZXBpY2tlci5vbignbW91c2VsZWF2ZScsICcuZGF0ZXBpY2tlci0tY2VsbCcsIHRoaXMuX29uTW91c2VMZWF2ZUNlbGwuYmluZCh0aGlzKSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmluaXRlZCA9IHRydWU7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2NyZWF0ZVNob3J0Q3V0czogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0aGlzLm1pbkRhdGUgPSB0aGlzLm9wdHMubWluRGF0ZSA/IHRoaXMub3B0cy5taW5EYXRlIDogbmV3IERhdGUoLTg2Mzk5OTk5MTM2MDAwMDApO1xyXG4gICAgICAgICAgICB0aGlzLm1heERhdGUgPSB0aGlzLm9wdHMubWF4RGF0ZSA/IHRoaXMub3B0cy5tYXhEYXRlIDogbmV3IERhdGUoODYzOTk5OTkxMzYwMDAwMCk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2JpbmRFdmVudHMgOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGVsLm9uKHRoaXMub3B0cy5zaG93RXZlbnQgKyAnLmFkcCcsIHRoaXMuX29uU2hvd0V2ZW50LmJpbmQodGhpcykpO1xyXG4gICAgICAgICAgICB0aGlzLiRlbC5vbignbW91c2V1cC5hZHAnLCB0aGlzLl9vbk1vdXNlVXBFbC5iaW5kKHRoaXMpKTtcclxuICAgICAgICAgICAgdGhpcy4kZWwub24oJ2JsdXIuYWRwJywgdGhpcy5fb25CbHVyLmJpbmQodGhpcykpO1xyXG4gICAgICAgICAgICB0aGlzLiRlbC5vbigna2V5dXAuYWRwJywgdGhpcy5fb25LZXlVcEdlbmVyYWwuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgICAgICQod2luZG93KS5vbigncmVzaXplLmFkcCcsIHRoaXMuX29uUmVzaXplLmJpbmQodGhpcykpO1xyXG4gICAgICAgICAgICAkKCdib2R5Jykub24oJ21vdXNldXAuYWRwJywgdGhpcy5fb25Nb3VzZVVwQm9keS5iaW5kKHRoaXMpKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfYmluZEtleWJvYXJkRXZlbnRzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGVsLm9uKCdrZXlkb3duLmFkcCcsIHRoaXMuX29uS2V5RG93bi5iaW5kKHRoaXMpKTtcclxuICAgICAgICAgICAgdGhpcy4kZWwub24oJ2tleXVwLmFkcCcsIHRoaXMuX29uS2V5VXAuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgICAgIHRoaXMuJGVsLm9uKCdob3RLZXkuYWRwJywgdGhpcy5fb25Ib3RLZXkuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2JpbmRUaW1lcGlja2VyRXZlbnRzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGVsLm9uKCd0aW1lQ2hhbmdlLmFkcCcsIHRoaXMuX29uVGltZUNoYW5nZS5iaW5kKHRoaXMpKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBpc1dlZWtlbmQ6IGZ1bmN0aW9uIChkYXkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMub3B0cy53ZWVrZW5kcy5pbmRleE9mKGRheSkgIT09IC0xO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9kZWZpbmVMb2NhbGU6IGZ1bmN0aW9uIChsYW5nKSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbGFuZyA9PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sb2MgPSAkLmZuLmRhdGVwaWNrZXIubGFuZ3VhZ2VbbGFuZ107XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMubG9jKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdDYW5cXCd0IGZpbmQgbGFuZ3VhZ2UgXCInICsgbGFuZyArICdcIiBpbiBEYXRlcGlja2VyLmxhbmd1YWdlLCB3aWxsIHVzZSBcInJ1XCIgaW5zdGVhZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9jID0gJC5leHRlbmQodHJ1ZSwge30sICQuZm4uZGF0ZXBpY2tlci5sYW5ndWFnZS5ydSlcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmxvYyA9ICQuZXh0ZW5kKHRydWUsIHt9LCAkLmZuLmRhdGVwaWNrZXIubGFuZ3VhZ2UucnUsICQuZm4uZGF0ZXBpY2tlci5sYW5ndWFnZVtsYW5nXSlcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubG9jID0gJC5leHRlbmQodHJ1ZSwge30sICQuZm4uZGF0ZXBpY2tlci5sYW5ndWFnZS5ydSwgbGFuZylcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMub3B0cy5kYXRlRm9ybWF0KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxvYy5kYXRlRm9ybWF0ID0gdGhpcy5vcHRzLmRhdGVGb3JtYXRcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMub3B0cy50aW1lRm9ybWF0KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxvYy50aW1lRm9ybWF0ID0gdGhpcy5vcHRzLnRpbWVGb3JtYXRcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMub3B0cy5maXJzdERheSAhPT0gJycpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubG9jLmZpcnN0RGF5ID0gdGhpcy5vcHRzLmZpcnN0RGF5XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdHMudGltZXBpY2tlcikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sb2MuZGF0ZUZvcm1hdCA9IFt0aGlzLmxvYy5kYXRlRm9ybWF0LCB0aGlzLmxvYy50aW1lRm9ybWF0XS5qb2luKHRoaXMub3B0cy5kYXRlVGltZVNlcGFyYXRvcik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdHMub25seVRpbWVwaWNrZXIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubG9jLmRhdGVGb3JtYXQgPSB0aGlzLmxvYy50aW1lRm9ybWF0O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgYm91bmRhcnkgPSB0aGlzLl9nZXRXb3JkQm91bmRhcnlSZWdFeHA7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxvYy50aW1lRm9ybWF0Lm1hdGNoKGJvdW5kYXJ5KCdhYScpKSB8fFxyXG4gICAgICAgICAgICAgICAgdGhpcy5sb2MudGltZUZvcm1hdC5tYXRjaChib3VuZGFyeSgnQUEnKSlcclxuICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgIHRoaXMuYW1wbSA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfYnVpbGREYXRlcGlja2Vyc0NvbnRhaW5lcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBjb250YWluZXJCdWlsdCA9IHRydWU7XHJcbiAgICAgICAgICAgICRib2R5LmFwcGVuZCgnPGRpdiBjbGFzcz1cImRhdGVwaWNrZXJzLWNvbnRhaW5lclwiIGlkPVwiZGF0ZXBpY2tlcnMtY29udGFpbmVyXCI+PC9kaXY+Jyk7XHJcbiAgICAgICAgICAgICRkYXRlcGlja2Vyc0NvbnRhaW5lciA9ICQoJyNkYXRlcGlja2Vycy1jb250YWluZXInKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfYnVpbGRCYXNlSHRtbDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2YXIgJGFwcGVuZFRhcmdldCxcclxuICAgICAgICAgICAgICAgICRpbmxpbmUgPSAkKCc8ZGl2IGNsYXNzPVwiZGF0ZXBpY2tlci1pbmxpbmVcIj4nKTtcclxuXHJcbiAgICAgICAgICAgIGlmKHRoaXMuZWwubm9kZU5hbWUgPT0gJ0lOUFVUJykge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLm9wdHMuaW5saW5lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJGFwcGVuZFRhcmdldCA9ICRkYXRlcGlja2Vyc0NvbnRhaW5lcjtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJGFwcGVuZFRhcmdldCA9ICRpbmxpbmUuaW5zZXJ0QWZ0ZXIodGhpcy4kZWwpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAkYXBwZW5kVGFyZ2V0ID0gJGlubGluZS5hcHBlbmRUbyh0aGlzLiRlbClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy4kZGF0ZXBpY2tlciA9ICQoYmFzZVRlbXBsYXRlKS5hcHBlbmRUbygkYXBwZW5kVGFyZ2V0KTtcclxuICAgICAgICAgICAgdGhpcy4kY29udGVudCA9ICQoJy5kYXRlcGlja2VyLS1jb250ZW50JywgdGhpcy4kZGF0ZXBpY2tlcik7XHJcbiAgICAgICAgICAgIHRoaXMuJG5hdiA9ICQoJy5kYXRlcGlja2VyLS1uYXYnLCB0aGlzLiRkYXRlcGlja2VyKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfdHJpZ2dlck9uQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5zZWxlY3RlZERhdGVzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgLy8gUHJldmVudCBmcm9tIHRyaWdnZXJpbmcgbXVsdGlwbGUgb25TZWxlY3QgY2FsbGJhY2sgd2l0aCBzYW1lIGFyZ3VtZW50IChlbXB0eSBzdHJpbmcpIGluIElFMTAtMTFcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9wcmV2T25TZWxlY3RWYWx1ZSA9PT0gJycpIHJldHVybjtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3ByZXZPblNlbGVjdFZhbHVlID0gJyc7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5vcHRzLm9uU2VsZWN0KCcnLCAnJywgdGhpcyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBzZWxlY3RlZERhdGVzID0gdGhpcy5zZWxlY3RlZERhdGVzLFxyXG4gICAgICAgICAgICAgICAgcGFyc2VkU2VsZWN0ZWQgPSBkYXRlcGlja2VyLmdldFBhcnNlZERhdGUoc2VsZWN0ZWREYXRlc1swXSksXHJcbiAgICAgICAgICAgICAgICBmb3JtYXR0ZWREYXRlcyxcclxuICAgICAgICAgICAgICAgIF90aGlzID0gdGhpcyxcclxuICAgICAgICAgICAgICAgIGRhdGVzID0gbmV3IERhdGUoXHJcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VkU2VsZWN0ZWQueWVhcixcclxuICAgICAgICAgICAgICAgICAgICBwYXJzZWRTZWxlY3RlZC5tb250aCxcclxuICAgICAgICAgICAgICAgICAgICBwYXJzZWRTZWxlY3RlZC5kYXRlLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhcnNlZFNlbGVjdGVkLmhvdXJzLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhcnNlZFNlbGVjdGVkLm1pbnV0ZXNcclxuICAgICAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICAgICAgZm9ybWF0dGVkRGF0ZXMgPSBzZWxlY3RlZERhdGVzLm1hcChmdW5jdGlvbiAoZGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfdGhpcy5mb3JtYXREYXRlKF90aGlzLmxvYy5kYXRlRm9ybWF0LCBkYXRlKVxyXG4gICAgICAgICAgICAgICAgfSkuam9pbih0aGlzLm9wdHMubXVsdGlwbGVEYXRlc1NlcGFyYXRvcik7XHJcblxyXG4gICAgICAgICAgICAvLyBDcmVhdGUgbmV3IGRhdGVzIGFycmF5LCB0byBzZXBhcmF0ZSBpdCBmcm9tIG9yaWdpbmFsIHNlbGVjdGVkRGF0ZXNcclxuICAgICAgICAgICAgaWYgKHRoaXMub3B0cy5tdWx0aXBsZURhdGVzIHx8IHRoaXMub3B0cy5yYW5nZSkge1xyXG4gICAgICAgICAgICAgICAgZGF0ZXMgPSBzZWxlY3RlZERhdGVzLm1hcChmdW5jdGlvbihkYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcnNlZERhdGUgPSBkYXRlcGlja2VyLmdldFBhcnNlZERhdGUoZGF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBEYXRlKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZWREYXRlLnllYXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlZERhdGUubW9udGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlZERhdGUuZGF0ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VkRGF0ZS5ob3VycyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VkRGF0ZS5taW51dGVzXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuX3ByZXZPblNlbGVjdFZhbHVlID0gZm9ybWF0dGVkRGF0ZXM7XHJcbiAgICAgICAgICAgIHRoaXMub3B0cy5vblNlbGVjdChmb3JtYXR0ZWREYXRlcywgZGF0ZXMsIHRoaXMpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIG5leHQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIGQgPSB0aGlzLnBhcnNlZERhdGUsXHJcbiAgICAgICAgICAgICAgICBvID0gdGhpcy5vcHRzO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMudmlldykge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnZGF5cyc6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXRlID0gbmV3IERhdGUoZC55ZWFyLCBkLm1vbnRoICsgMSwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG8ub25DaGFuZ2VNb250aCkgby5vbkNoYW5nZU1vbnRoKHRoaXMucGFyc2VkRGF0ZS5tb250aCwgdGhpcy5wYXJzZWREYXRlLnllYXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnbW9udGhzJzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRhdGUgPSBuZXcgRGF0ZShkLnllYXIgKyAxLCBkLm1vbnRoLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoby5vbkNoYW5nZVllYXIpIG8ub25DaGFuZ2VZZWFyKHRoaXMucGFyc2VkRGF0ZS55ZWFyKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ3llYXJzJzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRhdGUgPSBuZXcgRGF0ZShkLnllYXIgKyAxMCwgMCwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG8ub25DaGFuZ2VEZWNhZGUpIG8ub25DaGFuZ2VEZWNhZGUodGhpcy5jdXJEZWNhZGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgcHJldjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2YXIgZCA9IHRoaXMucGFyc2VkRGF0ZSxcclxuICAgICAgICAgICAgICAgIG8gPSB0aGlzLm9wdHM7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy52aWV3KSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdkYXlzJzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRhdGUgPSBuZXcgRGF0ZShkLnllYXIsIGQubW9udGggLSAxLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoby5vbkNoYW5nZU1vbnRoKSBvLm9uQ2hhbmdlTW9udGgodGhpcy5wYXJzZWREYXRlLm1vbnRoLCB0aGlzLnBhcnNlZERhdGUueWVhcik7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdtb250aHMnOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGF0ZSA9IG5ldyBEYXRlKGQueWVhciAtIDEsIGQubW9udGgsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvLm9uQ2hhbmdlWWVhcikgby5vbkNoYW5nZVllYXIodGhpcy5wYXJzZWREYXRlLnllYXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAneWVhcnMnOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGF0ZSA9IG5ldyBEYXRlKGQueWVhciAtIDEwLCAwLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoby5vbkNoYW5nZURlY2FkZSkgby5vbkNoYW5nZURlY2FkZSh0aGlzLmN1ckRlY2FkZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBmb3JtYXREYXRlOiBmdW5jdGlvbiAoc3RyaW5nLCBkYXRlKSB7XHJcbiAgICAgICAgICAgIGRhdGUgPSBkYXRlIHx8IHRoaXMuZGF0ZTtcclxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHN0cmluZyxcclxuICAgICAgICAgICAgICAgIGJvdW5kYXJ5ID0gdGhpcy5fZ2V0V29yZEJvdW5kYXJ5UmVnRXhwLFxyXG4gICAgICAgICAgICAgICAgbG9jYWxlID0gdGhpcy5sb2MsXHJcbiAgICAgICAgICAgICAgICBsZWFkaW5nWmVybyA9IGRhdGVwaWNrZXIuZ2V0TGVhZGluZ1plcm9OdW0sXHJcbiAgICAgICAgICAgICAgICBkZWNhZGUgPSBkYXRlcGlja2VyLmdldERlY2FkZShkYXRlKSxcclxuICAgICAgICAgICAgICAgIGQgPSBkYXRlcGlja2VyLmdldFBhcnNlZERhdGUoZGF0ZSksXHJcbiAgICAgICAgICAgICAgICBmdWxsSG91cnMgPSBkLmZ1bGxIb3VycyxcclxuICAgICAgICAgICAgICAgIGhvdXJzID0gZC5ob3VycyxcclxuICAgICAgICAgICAgICAgIGFtcG0gPSBzdHJpbmcubWF0Y2goYm91bmRhcnkoJ2FhJykpIHx8IHN0cmluZy5tYXRjaChib3VuZGFyeSgnQUEnKSksXHJcbiAgICAgICAgICAgICAgICBkYXlQZXJpb2QgPSAnYW0nLFxyXG4gICAgICAgICAgICAgICAgcmVwbGFjZXIgPSB0aGlzLl9yZXBsYWNlcixcclxuICAgICAgICAgICAgICAgIHZhbGlkSG91cnM7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRzLnRpbWVwaWNrZXIgJiYgdGhpcy50aW1lcGlja2VyICYmIGFtcG0pIHtcclxuICAgICAgICAgICAgICAgIHZhbGlkSG91cnMgPSB0aGlzLnRpbWVwaWNrZXIuX2dldFZhbGlkSG91cnNGcm9tRGF0ZShkYXRlLCBhbXBtKTtcclxuICAgICAgICAgICAgICAgIGZ1bGxIb3VycyA9IGxlYWRpbmdaZXJvKHZhbGlkSG91cnMuaG91cnMpO1xyXG4gICAgICAgICAgICAgICAgaG91cnMgPSB2YWxpZEhvdXJzLmhvdXJzO1xyXG4gICAgICAgICAgICAgICAgZGF5UGVyaW9kID0gdmFsaWRIb3Vycy5kYXlQZXJpb2Q7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHN3aXRjaCAodHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAvQC8udGVzdChyZXN1bHQpOlxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdC5yZXBsYWNlKC9ALywgZGF0ZS5nZXRUaW1lKCkpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAvYWEvLnRlc3QocmVzdWx0KTpcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSByZXBsYWNlcihyZXN1bHQsIGJvdW5kYXJ5KCdhYScpLCBkYXlQZXJpb2QpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAvQUEvLnRlc3QocmVzdWx0KTpcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSByZXBsYWNlcihyZXN1bHQsIGJvdW5kYXJ5KCdBQScpLCBkYXlQZXJpb2QudG9VcHBlckNhc2UoKSk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIC9kZC8udGVzdChyZXN1bHQpOlxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlcGxhY2VyKHJlc3VsdCwgYm91bmRhcnkoJ2RkJyksIGQuZnVsbERhdGUpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAvZC8udGVzdChyZXN1bHQpOlxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlcGxhY2VyKHJlc3VsdCwgYm91bmRhcnkoJ2QnKSwgZC5kYXRlKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgL0RELy50ZXN0KHJlc3VsdCk6XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcmVwbGFjZXIocmVzdWx0LCBib3VuZGFyeSgnREQnKSwgbG9jYWxlLmRheXNbZC5kYXldKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgL0QvLnRlc3QocmVzdWx0KTpcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSByZXBsYWNlcihyZXN1bHQsIGJvdW5kYXJ5KCdEJyksIGxvY2FsZS5kYXlzU2hvcnRbZC5kYXldKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgL21tLy50ZXN0KHJlc3VsdCk6XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcmVwbGFjZXIocmVzdWx0LCBib3VuZGFyeSgnbW0nKSwgZC5mdWxsTW9udGgpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAvbS8udGVzdChyZXN1bHQpOlxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlcGxhY2VyKHJlc3VsdCwgYm91bmRhcnkoJ20nKSwgZC5tb250aCArIDEpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAvTU0vLnRlc3QocmVzdWx0KTpcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSByZXBsYWNlcihyZXN1bHQsIGJvdW5kYXJ5KCdNTScpLCB0aGlzLmxvYy5tb250aHNbZC5tb250aF0pO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAvTS8udGVzdChyZXN1bHQpOlxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlcGxhY2VyKHJlc3VsdCwgYm91bmRhcnkoJ00nKSwgbG9jYWxlLm1vbnRoc1Nob3J0W2QubW9udGhdKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgL2lpLy50ZXN0KHJlc3VsdCk6XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcmVwbGFjZXIocmVzdWx0LCBib3VuZGFyeSgnaWknKSwgZC5mdWxsTWludXRlcyk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIC9pLy50ZXN0KHJlc3VsdCk6XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcmVwbGFjZXIocmVzdWx0LCBib3VuZGFyeSgnaScpLCBkLm1pbnV0ZXMpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAvaGgvLnRlc3QocmVzdWx0KTpcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSByZXBsYWNlcihyZXN1bHQsIGJvdW5kYXJ5KCdoaCcpLCBmdWxsSG91cnMpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAvaC8udGVzdChyZXN1bHQpOlxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlcGxhY2VyKHJlc3VsdCwgYm91bmRhcnkoJ2gnKSwgaG91cnMpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAveXl5eS8udGVzdChyZXN1bHQpOlxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlcGxhY2VyKHJlc3VsdCwgYm91bmRhcnkoJ3l5eXknKSwgZC55ZWFyKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgL3l5eXkxLy50ZXN0KHJlc3VsdCk6XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcmVwbGFjZXIocmVzdWx0LCBib3VuZGFyeSgneXl5eTEnKSwgZGVjYWRlWzBdKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgL3l5eXkyLy50ZXN0KHJlc3VsdCk6XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcmVwbGFjZXIocmVzdWx0LCBib3VuZGFyeSgneXl5eTInKSwgZGVjYWRlWzFdKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgL3l5Ly50ZXN0KHJlc3VsdCk6XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcmVwbGFjZXIocmVzdWx0LCBib3VuZGFyeSgneXknKSwgZC55ZWFyLnRvU3RyaW5nKCkuc2xpY2UoLTIpKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfcmVwbGFjZXI6IGZ1bmN0aW9uIChzdHIsIHJlZywgZGF0YSkge1xyXG4gICAgICAgICAgICByZXR1cm4gc3RyLnJlcGxhY2UocmVnLCBmdW5jdGlvbiAobWF0Y2gsIHAxLHAyLHAzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcDEgKyBkYXRhICsgcDM7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2dldFdvcmRCb3VuZGFyeVJlZ0V4cDogZnVuY3Rpb24gKHNpZ24pIHtcclxuICAgICAgICAgICAgdmFyIHN5bWJvbHMgPSAnXFxcXHN8XFxcXC58LXwvfFxcXFxcXFxcfCx8XFxcXCR8XFxcXCF8XFxcXD98Onw7JztcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgUmVnRXhwKCcoXnw+fCcgKyBzeW1ib2xzICsgJykoJyArIHNpZ24gKyAnKSgkfDx8JyArIHN5bWJvbHMgKyAnKScsICdnJyk7XHJcbiAgICAgICAgfSxcclxuXHJcblxyXG4gICAgICAgIHNlbGVjdERhdGU6IGZ1bmN0aW9uIChkYXRlKSB7XHJcbiAgICAgICAgICAgIHZhciBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgICAgICAgICBvcHRzID0gX3RoaXMub3B0cyxcclxuICAgICAgICAgICAgICAgIGQgPSBfdGhpcy5wYXJzZWREYXRlLFxyXG4gICAgICAgICAgICAgICAgc2VsZWN0ZWREYXRlcyA9IF90aGlzLnNlbGVjdGVkRGF0ZXMsXHJcbiAgICAgICAgICAgICAgICBsZW4gPSBzZWxlY3RlZERhdGVzLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgIG5ld0RhdGUgPSAnJztcclxuXHJcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGUpKSB7XHJcbiAgICAgICAgICAgICAgICBkYXRlLmZvckVhY2goZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICBfdGhpcy5zZWxlY3REYXRlKGQpXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCEoZGF0ZSBpbnN0YW5jZW9mIERhdGUpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICB0aGlzLmxhc3RTZWxlY3RlZERhdGUgPSBkYXRlO1xyXG5cclxuICAgICAgICAgICAgLy8gU2V0IG5ldyB0aW1lIHZhbHVlcyBmcm9tIERhdGVcclxuICAgICAgICAgICAgaWYgKHRoaXMudGltZXBpY2tlcikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50aW1lcGlja2VyLl9zZXRUaW1lKGRhdGUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBPbiB0aGlzIHN0ZXAgdGltZXBpY2tlciB3aWxsIHNldCB2YWxpZCB2YWx1ZXMgaW4gaXQncyBpbnN0YW5jZVxyXG4gICAgICAgICAgICBfdGhpcy5fdHJpZ2dlcignc2VsZWN0RGF0ZScsIGRhdGUpO1xyXG5cclxuICAgICAgICAgICAgLy8gU2V0IGNvcnJlY3QgdGltZSB2YWx1ZXMgYWZ0ZXIgdGltZXBpY2tlcidzIHZhbGlkYXRpb25cclxuICAgICAgICAgICAgLy8gUHJldmVudCBmcm9tIHNldHRpbmcgaG91cnMgb3IgbWludXRlcyB3aGljaCB2YWx1ZXMgYXJlIGxlc3NlciB0aGVuIGBtaW5gIHZhbHVlIG9yXHJcbiAgICAgICAgICAgIC8vIGdyZWF0ZXIgdGhlbiBgbWF4YCB2YWx1ZVxyXG4gICAgICAgICAgICBpZiAodGhpcy50aW1lcGlja2VyKSB7XHJcbiAgICAgICAgICAgICAgICBkYXRlLnNldEhvdXJzKHRoaXMudGltZXBpY2tlci5ob3Vycyk7XHJcbiAgICAgICAgICAgICAgICBkYXRlLnNldE1pbnV0ZXModGhpcy50aW1lcGlja2VyLm1pbnV0ZXMpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChfdGhpcy52aWV3ID09ICdkYXlzJykge1xyXG4gICAgICAgICAgICAgICAgaWYgKGRhdGUuZ2V0TW9udGgoKSAhPSBkLm1vbnRoICYmIG9wdHMubW92ZVRvT3RoZXJNb250aHNPblNlbGVjdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld0RhdGUgPSBuZXcgRGF0ZShkYXRlLmdldEZ1bGxZZWFyKCksIGRhdGUuZ2V0TW9udGgoKSwgMSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChfdGhpcy52aWV3ID09ICd5ZWFycycpIHtcclxuICAgICAgICAgICAgICAgIGlmIChkYXRlLmdldEZ1bGxZZWFyKCkgIT0gZC55ZWFyICYmIG9wdHMubW92ZVRvT3RoZXJZZWFyc09uU2VsZWN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3RGF0ZSA9IG5ldyBEYXRlKGRhdGUuZ2V0RnVsbFllYXIoKSwgMCwgMSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChvcHRzLmNhbGVuZGFycyA9PT0gMSAmJiBuZXdEYXRlKSB7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy5zaWxlbnQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuZGF0ZSA9IG5ld0RhdGU7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy5zaWxlbnQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIF90aGlzLm5hdi5fcmVuZGVyKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG9wdHMubXVsdGlwbGVEYXRlcyAmJiAhb3B0cy5yYW5nZSkgeyAvLyBTZXQgcHJpb3JpdHkgdG8gcmFuZ2UgZnVuY3Rpb25hbGl0eVxyXG4gICAgICAgICAgICAgICAgaWYgKGxlbiA9PT0gb3B0cy5tdWx0aXBsZURhdGVzKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICBpZiAoIV90aGlzLl9pc1NlbGVjdGVkKGRhdGUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuc2VsZWN0ZWREYXRlcy5wdXNoKGRhdGUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKG9wdHMucmFuZ2UpIHtcclxuICAgICAgICAgICAgICAgIGlmIChsZW4gPT0gMikge1xyXG4gICAgICAgICAgICAgICAgICAgIF90aGlzLnNlbGVjdGVkRGF0ZXMgPSBbZGF0ZV07XHJcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMubWluUmFuZ2UgPSBkYXRlO1xyXG4gICAgICAgICAgICAgICAgICAgIF90aGlzLm1heFJhbmdlID0gJyc7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxlbiA9PSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuc2VsZWN0ZWREYXRlcy5wdXNoKGRhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghX3RoaXMubWF4UmFuZ2Upe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5tYXhSYW5nZSA9IGRhdGU7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMubWluUmFuZ2UgPSBkYXRlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAvLyBTd2FwIGRhdGVzIGlmIHRoZXkgd2VyZSBzZWxlY3RlZCB2aWEgZHAuc2VsZWN0RGF0ZSgpIGFuZCBzZWNvbmQgZGF0ZSB3YXMgc21hbGxlciB0aGVuIGZpcnN0XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGVwaWNrZXIuYmlnZ2VyKF90aGlzLm1heFJhbmdlLCBfdGhpcy5taW5SYW5nZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMubWF4UmFuZ2UgPSBfdGhpcy5taW5SYW5nZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMubWluUmFuZ2UgPSBkYXRlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBfdGhpcy5zZWxlY3RlZERhdGVzID0gW190aGlzLm1pblJhbmdlLCBfdGhpcy5tYXhSYW5nZV1cclxuXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIF90aGlzLnNlbGVjdGVkRGF0ZXMgPSBbZGF0ZV07XHJcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMubWluUmFuZ2UgPSBkYXRlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuc2VsZWN0ZWREYXRlcyA9IFtkYXRlXTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgX3RoaXMuX3NldElucHV0VmFsdWUoKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChvcHRzLm9uU2VsZWN0KSB7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy5fdHJpZ2dlck9uQ2hhbmdlKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChvcHRzLmF1dG9DbG9zZSAmJiAhdGhpcy50aW1lcGlja2VySXNBY3RpdmUpIHtcclxuICAgICAgICAgICAgICAgIGlmICghb3B0cy5tdWx0aXBsZURhdGVzICYmICFvcHRzLnJhbmdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuaGlkZSgpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvcHRzLnJhbmdlICYmIF90aGlzLnNlbGVjdGVkRGF0ZXMubGVuZ3RoID09IDIpIHtcclxuICAgICAgICAgICAgICAgICAgICBfdGhpcy5oaWRlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuX2xvb3BlcihfdGhpcy52aWV3c1t0aGlzLmN1cnJlbnRWaWV3XSwgJ19yZW5kZXInKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICByZW1vdmVEYXRlOiBmdW5jdGlvbiAoZGF0ZSkge1xyXG4gICAgICAgICAgICB2YXIgc2VsZWN0ZWQgPSB0aGlzLnNlbGVjdGVkRGF0ZXMsXHJcbiAgICAgICAgICAgICAgICBfdGhpcyA9IHRoaXM7XHJcblxyXG4gICAgICAgICAgICBpZiAoIShkYXRlIGluc3RhbmNlb2YgRGF0ZSkpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBzZWxlY3RlZC5zb21lKGZ1bmN0aW9uIChjdXJEYXRlLCBpKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGF0ZXBpY2tlci5pc1NhbWUoY3VyRGF0ZSwgZGF0ZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZC5zcGxpY2UoaSwgMSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghX3RoaXMuc2VsZWN0ZWREYXRlcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMubWluUmFuZ2UgPSAnJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMubWF4UmFuZ2UgPSAnJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMubGFzdFNlbGVjdGVkRGF0ZSA9ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLmxhc3RTZWxlY3RlZERhdGUgPSBfdGhpcy5zZWxlY3RlZERhdGVzW190aGlzLnNlbGVjdGVkRGF0ZXMubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBfdGhpcy52aWV3c1tfdGhpcy5jdXJyZW50Vmlld10uX3JlbmRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIF90aGlzLl9zZXRJbnB1dFZhbHVlKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfdGhpcy5vcHRzLm9uU2VsZWN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl90cmlnZ2VyT25DaGFuZ2UoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgdG9kYXk6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGhpcy5zaWxlbnQgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLnZpZXcgPSB0aGlzLm9wdHMubWluVmlldztcclxuICAgICAgICAgICAgdGhpcy5zaWxlbnQgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5kYXRlID0gbmV3IERhdGUoKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdHMudG9kYXlCdXR0b24gaW5zdGFuY2VvZiBEYXRlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdERhdGUodGhpcy5vcHRzLnRvZGF5QnV0dG9uKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgY2xlYXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZERhdGVzID0gW107XHJcbiAgICAgICAgICAgIHRoaXMubWluUmFuZ2UgPSAnJztcclxuICAgICAgICAgICAgdGhpcy5tYXhSYW5nZSA9ICcnO1xyXG4gICAgICAgICAgICB0aGlzLnZpZXdzW3RoaXMuY3VycmVudFZpZXddLl9yZW5kZXIoKTtcclxuICAgICAgICAgICAgdGhpcy5fc2V0SW5wdXRWYWx1ZSgpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRzLm9uU2VsZWN0KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl90cmlnZ2VyT25DaGFuZ2UoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogVXBkYXRlcyBkYXRlcGlja2VyIG9wdGlvbnNcclxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IHBhcmFtIC0gcGFyYW1ldGVyJ3MgbmFtZSB0byB1cGRhdGUuIElmIG9iamVjdCB0aGVuIGl0IHdpbGwgZXh0ZW5kIGN1cnJlbnQgb3B0aW9uc1xyXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcnxPYmplY3R9IFt2YWx1ZV0gLSBuZXcgcGFyYW0gdmFsdWVcclxuICAgICAgICAgKi9cclxuICAgICAgICB1cGRhdGU6IGZ1bmN0aW9uIChwYXJhbSwgdmFsdWUpIHtcclxuICAgICAgICAgICAgdmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICBsYXN0U2VsZWN0ZWREYXRlID0gdGhpcy5sYXN0U2VsZWN0ZWREYXRlO1xyXG5cclxuICAgICAgICAgICAgaWYgKGxlbiA9PSAyKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9wdHNbcGFyYW1dID0gdmFsdWU7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGVuID09IDEgJiYgdHlwZW9mIHBhcmFtID09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9wdHMgPSAkLmV4dGVuZCh0cnVlLCB0aGlzLm9wdHMsIHBhcmFtKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLl9jcmVhdGVTaG9ydEN1dHMoKTtcclxuICAgICAgICAgICAgdGhpcy5fc3luY1dpdGhNaW5NYXhEYXRlcygpO1xyXG4gICAgICAgICAgICB0aGlzLl9kZWZpbmVMb2NhbGUodGhpcy5vcHRzLmxhbmd1YWdlKTtcclxuICAgICAgICAgICAgdGhpcy5uYXYuX2FkZEJ1dHRvbnNJZk5lZWQoKTtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLm9wdHMub25seVRpbWVwaWNrZXIpIHRoaXMubmF2Ll9yZW5kZXIoKTtcclxuICAgICAgICAgICAgdGhpcy5fbG9vcGVyKHRoaXMudmlld3NbdGhpcy5jdXJyZW50Vmlld10sICdfcmVuZGVyJyk7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5lbElzSW5wdXQgJiYgIXRoaXMub3B0cy5pbmxpbmUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3NldFBvc2l0aW9uQ2xhc3Nlcyh0aGlzLm9wdHMucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudmlzaWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0UG9zaXRpb24odGhpcy5vcHRzLnBvc2l0aW9uKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRzLmNsYXNzZXMpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGRhdGVwaWNrZXIuYWRkQ2xhc3ModGhpcy5vcHRzLmNsYXNzZXMpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdHMub25seVRpbWVwaWNrZXIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGRhdGVwaWNrZXIuYWRkQ2xhc3MoJy1vbmx5LXRpbWVwaWNrZXItJyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdHMuY2FsZW5kYXJzID4gMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kZGF0ZXBpY2tlci5hZGRDbGFzcygnLW11bHRpcGxlLWNhbHMtJyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdHMudGltZXBpY2tlcikge1xyXG4gICAgICAgICAgICAgICAgaWYgKGxhc3RTZWxlY3RlZERhdGUpIHRoaXMudGltZXBpY2tlci5faGFuZGxlRGF0ZShsYXN0U2VsZWN0ZWREYXRlKTtcclxuICAgICAgICAgICAgICAgIHRoaXMudGltZXBpY2tlci5fdXBkYXRlUmFuZ2VzKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVwaWNrZXIuX3VwZGF0ZUN1cnJlbnRUaW1lKCk7XHJcbiAgICAgICAgICAgICAgICAvLyBDaGFuZ2UgaG91cnMgYW5kIG1pbnV0ZXMgaWYgaXQncyB2YWx1ZXMgaGF2ZSBiZWVuIGNoYW5nZWQgdGhyb3VnaCBtaW4vbWF4IGhvdXJzL21pbnV0ZXNcclxuICAgICAgICAgICAgICAgIGlmIChsYXN0U2VsZWN0ZWREYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGFzdFNlbGVjdGVkRGF0ZS5zZXRIb3Vycyh0aGlzLnRpbWVwaWNrZXIuaG91cnMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxhc3RTZWxlY3RlZERhdGUuc2V0TWludXRlcyh0aGlzLnRpbWVwaWNrZXIubWludXRlcyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuX3NldElucHV0VmFsdWUoKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9zeW5jV2l0aE1pbk1heERhdGVzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHZhciBjdXJUaW1lID0gdGhpcy5kYXRlLmdldFRpbWUoKTtcclxuICAgICAgICAgICAgdGhpcy5zaWxlbnQgPSB0cnVlO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5taW5UaW1lID4gY3VyVGltZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kYXRlID0gdGhpcy5taW5EYXRlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5tYXhUaW1lIDwgY3VyVGltZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kYXRlID0gdGhpcy5tYXhEYXRlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuc2lsZW50ID0gZmFsc2U7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2lzU2VsZWN0ZWQ6IGZ1bmN0aW9uIChjaGVja0RhdGUsIGNlbGxUeXBlKSB7XHJcbiAgICAgICAgICAgIHZhciByZXMgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZERhdGVzLnNvbWUoZnVuY3Rpb24gKGRhdGUpIHtcclxuICAgICAgICAgICAgICAgIGlmIChkYXRlcGlja2VyLmlzU2FtZShkYXRlLCBjaGVja0RhdGUsIGNlbGxUeXBlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcyA9IGRhdGU7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9zZXRJbnB1dFZhbHVlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHZhciBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgICAgICAgICBvcHRzID0gX3RoaXMub3B0cyxcclxuICAgICAgICAgICAgICAgIGZvcm1hdCA9IF90aGlzLmxvYy5kYXRlRm9ybWF0LFxyXG4gICAgICAgICAgICAgICAgYWx0Rm9ybWF0ID0gb3B0cy5hbHRGaWVsZERhdGVGb3JtYXQsXHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IF90aGlzLnNlbGVjdGVkRGF0ZXMubWFwKGZ1bmN0aW9uIChkYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF90aGlzLmZvcm1hdERhdGUoZm9ybWF0LCBkYXRlKVxyXG4gICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICBhbHRWYWx1ZXM7XHJcblxyXG4gICAgICAgICAgICBpZiAob3B0cy5hbHRGaWVsZCAmJiBfdGhpcy4kYWx0RmllbGQubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICBhbHRWYWx1ZXMgPSB0aGlzLnNlbGVjdGVkRGF0ZXMubWFwKGZ1bmN0aW9uIChkYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF90aGlzLmZvcm1hdERhdGUoYWx0Rm9ybWF0LCBkYXRlKVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBhbHRWYWx1ZXMgPSBhbHRWYWx1ZXMuam9pbih0aGlzLm9wdHMubXVsdGlwbGVEYXRlc1NlcGFyYXRvcik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRhbHRGaWVsZC52YWwoYWx0VmFsdWVzKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5qb2luKHRoaXMub3B0cy5tdWx0aXBsZURhdGVzU2VwYXJhdG9yKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuJGVsLnZhbCh2YWx1ZSlcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDaGVjayBpZiBkYXRlIGlzIGJldHdlZW4gbWluRGF0ZSBhbmQgbWF4RGF0ZVxyXG4gICAgICAgICAqIEBwYXJhbSBkYXRlIHtvYmplY3R9IC0gZGF0ZSBvYmplY3RcclxuICAgICAgICAgKiBAcGFyYW0gdHlwZSB7c3RyaW5nfSAtIGNlbGwgdHlwZVxyXG4gICAgICAgICAqIEByZXR1cm5zIHtib29sZWFufVxyXG4gICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgX2lzSW5SYW5nZTogZnVuY3Rpb24gKGRhdGUsIHR5cGUpIHtcclxuICAgICAgICAgICAgdmFyIHRpbWUgPSBkYXRlLmdldFRpbWUoKSxcclxuICAgICAgICAgICAgICAgIGQgPSBkYXRlcGlja2VyLmdldFBhcnNlZERhdGUoZGF0ZSksXHJcbiAgICAgICAgICAgICAgICBtaW4gPSBkYXRlcGlja2VyLmdldFBhcnNlZERhdGUodGhpcy5taW5EYXRlKSxcclxuICAgICAgICAgICAgICAgIG1heCA9IGRhdGVwaWNrZXIuZ2V0UGFyc2VkRGF0ZSh0aGlzLm1heERhdGUpLFxyXG4gICAgICAgICAgICAgICAgZE1pblRpbWUgPSBuZXcgRGF0ZShkLnllYXIsIGQubW9udGgsIG1pbi5kYXRlKS5nZXRUaW1lKCksXHJcbiAgICAgICAgICAgICAgICBkTWF4VGltZSA9IG5ldyBEYXRlKGQueWVhciwgZC5tb250aCwgbWF4LmRhdGUpLmdldFRpbWUoKSxcclxuICAgICAgICAgICAgICAgIHR5cGVzID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGRheTogdGltZSA+PSB0aGlzLm1pblRpbWUgJiYgdGltZSA8PSB0aGlzLm1heFRpbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgbW9udGg6IGRNaW5UaW1lID49IHRoaXMubWluVGltZSAmJiBkTWF4VGltZSA8PSB0aGlzLm1heFRpbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgeWVhcjogZC55ZWFyID49IG1pbi55ZWFyICYmIGQueWVhciA8PSBtYXgueWVhclxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgcmV0dXJuIHR5cGUgPyB0eXBlc1t0eXBlXSA6IHR5cGVzLmRheVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9nZXREaW1lbnNpb25zOiBmdW5jdGlvbiAoJGVsKSB7XHJcbiAgICAgICAgICAgIHZhciBvZmZzZXQgPSAkZWwub2Zmc2V0KCk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgd2lkdGg6ICRlbC5vdXRlcldpZHRoKCksXHJcbiAgICAgICAgICAgICAgICBoZWlnaHQ6ICRlbC5vdXRlckhlaWdodCgpLFxyXG4gICAgICAgICAgICAgICAgbGVmdDogb2Zmc2V0LmxlZnQsXHJcbiAgICAgICAgICAgICAgICB0b3A6IG9mZnNldC50b3BcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9nZXREYXRlRnJvbUNlbGw6IGZ1bmN0aW9uIChjZWxsKSB7XHJcbiAgICAgICAgICAgIHZhciBjdXJEYXRlID0gdGhpcy5wYXJzZWREYXRlLFxyXG4gICAgICAgICAgICAgICAgeWVhciA9IGNlbGwuZGF0YSgneWVhcicpIHx8IGN1ckRhdGUueWVhcixcclxuICAgICAgICAgICAgICAgIG1vbnRoID0gY2VsbC5kYXRhKCdtb250aCcpID09IHVuZGVmaW5lZCA/IGN1ckRhdGUubW9udGggOiBjZWxsLmRhdGEoJ21vbnRoJyksXHJcbiAgICAgICAgICAgICAgICBkYXRlID0gY2VsbC5kYXRhKCdkYXRlJykgfHwgMTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgRGF0ZSh5ZWFyLCBtb250aCwgZGF0ZSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX3NldFBvc2l0aW9uQ2xhc3NlczogZnVuY3Rpb24gKHBvcykge1xyXG4gICAgICAgICAgICBwb3MgPSBwb3Muc3BsaXQoJyAnKTtcclxuICAgICAgICAgICAgdmFyIG1haW4gPSBwb3NbMF0sXHJcbiAgICAgICAgICAgICAgICBzZWMgPSBwb3NbMV0sXHJcbiAgICAgICAgICAgICAgICBjbGFzc2VzID0gJ2RhdGVwaWNrZXIgLScgKyBtYWluICsgJy0nICsgc2VjICsgJy0gLWZyb20tJyArIG1haW4gKyAnLSc7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy52aXNpYmxlKSBjbGFzc2VzICs9ICcgYWN0aXZlJztcclxuICAgICAgICAgICAgaWYgKHRoaXMub3B0cy5jYWxlbmRhcnMgPiAxKSBjbGFzc2VzICs9ICcgLW11bHRpcGxlLWNhbHMtJztcclxuXHJcbiAgICAgICAgICAgIHRoaXMuJGRhdGVwaWNrZXJcclxuICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdjbGFzcycpXHJcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoY2xhc3Nlcyk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgc2V0UG9zaXRpb246IGZ1bmN0aW9uIChwb3NpdGlvbikge1xyXG4gICAgICAgICAgICBwb3NpdGlvbiA9IHBvc2l0aW9uIHx8IHRoaXMub3B0cy5wb3NpdGlvbjtcclxuXHJcbiAgICAgICAgICAgIHZhciBkaW1zID0gdGhpcy5fZ2V0RGltZW5zaW9ucyh0aGlzLiRlbCksXHJcbiAgICAgICAgICAgICAgICBzZWxmRGltcyA9IHRoaXMuX2dldERpbWVuc2lvbnModGhpcy4kZGF0ZXBpY2tlciksXHJcbiAgICAgICAgICAgICAgICBwb3MgPSBwb3NpdGlvbi5zcGxpdCgnICcpLFxyXG4gICAgICAgICAgICAgICAgdG9wLCBsZWZ0LFxyXG4gICAgICAgICAgICAgICAgb2Zmc2V0ID0gdGhpcy5vcHRzLm9mZnNldCxcclxuICAgICAgICAgICAgICAgIG1haW4gPSBwb3NbMF0sXHJcbiAgICAgICAgICAgICAgICBzZWNvbmRhcnkgPSBwb3NbMV07XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKG1haW4pIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgJ3RvcCc6XHJcbiAgICAgICAgICAgICAgICAgICAgdG9wID0gZGltcy50b3AgLSBzZWxmRGltcy5oZWlnaHQgLSBvZmZzZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdyaWdodCc6XHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdCA9IGRpbXMubGVmdCArIGRpbXMud2lkdGggKyBvZmZzZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdib3R0b20nOlxyXG4gICAgICAgICAgICAgICAgICAgIHRvcCA9IGRpbXMudG9wICsgZGltcy5oZWlnaHQgKyBvZmZzZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdsZWZ0JzpcclxuICAgICAgICAgICAgICAgICAgICBsZWZ0ID0gZGltcy5sZWZ0IC0gc2VsZkRpbXMud2lkdGggLSBvZmZzZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHN3aXRjaChzZWNvbmRhcnkpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgJ3RvcCc6XHJcbiAgICAgICAgICAgICAgICAgICAgdG9wID0gZGltcy50b3A7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdyaWdodCc6XHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdCA9IGRpbXMubGVmdCArIGRpbXMud2lkdGggLSBzZWxmRGltcy53aWR0aDtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ2JvdHRvbSc6XHJcbiAgICAgICAgICAgICAgICAgICAgdG9wID0gZGltcy50b3AgKyBkaW1zLmhlaWdodCAtIHNlbGZEaW1zLmhlaWdodDtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ2xlZnQnOlxyXG4gICAgICAgICAgICAgICAgICAgIGxlZnQgPSBkaW1zLmxlZnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdjZW50ZXInOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmICgvbGVmdHxyaWdodC8udGVzdChtYWluKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0b3AgPSBkaW1zLnRvcCArIGRpbXMuaGVpZ2h0LzIgLSBzZWxmRGltcy5oZWlnaHQvMjtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZWZ0ID0gZGltcy5sZWZ0ICsgZGltcy53aWR0aC8yIC0gc2VsZkRpbXMud2lkdGgvMjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuJGRhdGVwaWNrZXJcclxuICAgICAgICAgICAgICAgIC5jc3Moe1xyXG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IGxlZnQsXHJcbiAgICAgICAgICAgICAgICAgICAgdG9wOiB0b3BcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgc2hvdzogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2YXIgb25TaG93ID0gdGhpcy5vcHRzLm9uU2hvdztcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2V0UG9zaXRpb24odGhpcy5vcHRzLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgdGhpcy4kZGF0ZXBpY2tlci5hZGRDbGFzcygnYWN0aXZlJyk7XHJcbiAgICAgICAgICAgIHRoaXMudmlzaWJsZSA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICBpZiAob25TaG93KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9iaW5kVmlzaW9uRXZlbnRzKG9uU2hvdylcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGhpZGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIG9uSGlkZSA9IHRoaXMub3B0cy5vbkhpZGU7XHJcblxyXG4gICAgICAgICAgICB0aGlzLiRkYXRlcGlja2VyXHJcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpXHJcbiAgICAgICAgICAgICAgICAuY3NzKHtcclxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiAnLTEwMDAwMHB4J1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmZvY3VzZWQgPSAnJztcclxuICAgICAgICAgICAgdGhpcy5rZXlzID0gW107XHJcblxyXG4gICAgICAgICAgICB0aGlzLmluRm9jdXMgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuJGVsLmJsdXIoKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChvbkhpZGUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2JpbmRWaXNpb25FdmVudHMob25IaWRlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZG93bjogZnVuY3Rpb24gKGRhdGUpIHtcclxuICAgICAgICAgICAgdGhpcy5fY2hhbmdlVmlldyhkYXRlLCAnZG93bicpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHVwOiBmdW5jdGlvbiAoZGF0ZSkge1xyXG4gICAgICAgICAgICB0aGlzLl9jaGFuZ2VWaWV3KGRhdGUsICd1cCcpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9iaW5kVmlzaW9uRXZlbnRzOiBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgdGhpcy4kZGF0ZXBpY2tlci5vZmYoJ3RyYW5zaXRpb25lbmQuZHAnKTtcclxuICAgICAgICAgICAgZXZlbnQodGhpcywgZmFsc2UpO1xyXG4gICAgICAgICAgICB0aGlzLiRkYXRlcGlja2VyLm9uZSgndHJhbnNpdGlvbmVuZC5kcCcsIGV2ZW50LmJpbmQodGhpcywgdGhpcywgdHJ1ZSkpXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2NoYW5nZVZpZXc6IGZ1bmN0aW9uIChkYXRlLCBkaXIpIHtcclxuICAgICAgICAgICAgZGF0ZSA9IGRhdGUgfHwgdGhpcy5mb2N1c2VkIHx8IHRoaXMuZGF0ZTtcclxuXHJcbiAgICAgICAgICAgIHZhciBuZXh0VmlldyA9IGRpciA9PSAndXAnID8gdGhpcy52aWV3SW5kZXggKyAxIDogdGhpcy52aWV3SW5kZXggLSAxO1xyXG4gICAgICAgICAgICBpZiAobmV4dFZpZXcgPiAyKSBuZXh0VmlldyA9IDI7XHJcbiAgICAgICAgICAgIGlmIChuZXh0VmlldyA8IDApIG5leHRWaWV3ID0gMDtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2lsZW50ID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5kYXRlID0gbmV3IERhdGUoZGF0ZS5nZXRGdWxsWWVhcigpLCBkYXRlLmdldE1vbnRoKCksIDEpO1xyXG4gICAgICAgICAgICB0aGlzLnNpbGVudCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLnZpZXcgPSB0aGlzLnZpZXdJbmRleGVzW25leHRWaWV3XTtcclxuXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2hhbmRsZUhvdEtleTogZnVuY3Rpb24gKGtleSkge1xyXG4gICAgICAgICAgICB2YXIgZGF0ZSA9IGRhdGVwaWNrZXIuZ2V0UGFyc2VkRGF0ZSh0aGlzLl9nZXRGb2N1c2VkRGF0ZSgpKSxcclxuICAgICAgICAgICAgICAgIGZvY3VzZWRQYXJzZWQsXHJcbiAgICAgICAgICAgICAgICBvID0gdGhpcy5vcHRzLFxyXG4gICAgICAgICAgICAgICAgbmV3RGF0ZSxcclxuICAgICAgICAgICAgICAgIHRvdGFsRGF5c0luTmV4dE1vbnRoLFxyXG4gICAgICAgICAgICAgICAgbW9udGhDaGFuZ2VkID0gZmFsc2UsXHJcbiAgICAgICAgICAgICAgICB5ZWFyQ2hhbmdlZCA9IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgZGVjYWRlQ2hhbmdlZCA9IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgeSA9IGRhdGUueWVhcixcclxuICAgICAgICAgICAgICAgIG0gPSBkYXRlLm1vbnRoLFxyXG4gICAgICAgICAgICAgICAgZCA9IGRhdGUuZGF0ZTtcclxuXHJcbiAgICAgICAgICAgIHN3aXRjaCAoa2V5KSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdjdHJsUmlnaHQnOlxyXG4gICAgICAgICAgICAgICAgY2FzZSAnY3RybFVwJzpcclxuICAgICAgICAgICAgICAgICAgICBtICs9IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgbW9udGhDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ2N0cmxMZWZ0JzpcclxuICAgICAgICAgICAgICAgIGNhc2UgJ2N0cmxEb3duJzpcclxuICAgICAgICAgICAgICAgICAgICBtIC09IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgbW9udGhDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ3NoaWZ0UmlnaHQnOlxyXG4gICAgICAgICAgICAgICAgY2FzZSAnc2hpZnRVcCc6XHJcbiAgICAgICAgICAgICAgICAgICAgeWVhckNoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHkgKz0gMTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ3NoaWZ0TGVmdCc6XHJcbiAgICAgICAgICAgICAgICBjYXNlICdzaGlmdERvd24nOlxyXG4gICAgICAgICAgICAgICAgICAgIHllYXJDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB5IC09IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdhbHRSaWdodCc6XHJcbiAgICAgICAgICAgICAgICBjYXNlICdhbHRVcCc6XHJcbiAgICAgICAgICAgICAgICAgICAgZGVjYWRlQ2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgeSArPSAxMDtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ2FsdExlZnQnOlxyXG4gICAgICAgICAgICAgICAgY2FzZSAnYWx0RG93bic6XHJcbiAgICAgICAgICAgICAgICAgICAgZGVjYWRlQ2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgeSAtPSAxMDtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ2N0cmxTaGlmdFVwJzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnVwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRvdGFsRGF5c0luTmV4dE1vbnRoID0gZGF0ZXBpY2tlci5nZXREYXlzQ291bnQobmV3IERhdGUoeSxtKSk7XHJcbiAgICAgICAgICAgIG5ld0RhdGUgPSBuZXcgRGF0ZSh5LG0sZCk7XHJcblxyXG4gICAgICAgICAgICAvLyBJZiBuZXh0IG1vbnRoIGhhcyBsZXNzIGRheXMgdGhhbiBjdXJyZW50LCBzZXQgZGF0ZSB0byB0b3RhbCBkYXlzIGluIHRoYXQgbW9udGhcclxuICAgICAgICAgICAgaWYgKHRvdGFsRGF5c0luTmV4dE1vbnRoIDwgZCkgZCA9IHRvdGFsRGF5c0luTmV4dE1vbnRoO1xyXG5cclxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgbmV3RGF0ZSBpcyBpbiB2YWxpZCByYW5nZVxyXG4gICAgICAgICAgICBpZiAobmV3RGF0ZS5nZXRUaW1lKCkgPCB0aGlzLm1pblRpbWUpIHtcclxuICAgICAgICAgICAgICAgIG5ld0RhdGUgPSB0aGlzLm1pbkRhdGU7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobmV3RGF0ZS5nZXRUaW1lKCkgPiB0aGlzLm1heFRpbWUpIHtcclxuICAgICAgICAgICAgICAgIG5ld0RhdGUgPSB0aGlzLm1heERhdGU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuZm9jdXNlZCA9IG5ld0RhdGU7XHJcblxyXG4gICAgICAgICAgICBmb2N1c2VkUGFyc2VkID0gZGF0ZXBpY2tlci5nZXRQYXJzZWREYXRlKG5ld0RhdGUpO1xyXG4gICAgICAgICAgICBpZiAobW9udGhDaGFuZ2VkICYmIG8ub25DaGFuZ2VNb250aCkge1xyXG4gICAgICAgICAgICAgICAgby5vbkNoYW5nZU1vbnRoKGZvY3VzZWRQYXJzZWQubW9udGgsIGZvY3VzZWRQYXJzZWQueWVhcilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoeWVhckNoYW5nZWQgJiYgby5vbkNoYW5nZVllYXIpIHtcclxuICAgICAgICAgICAgICAgIG8ub25DaGFuZ2VZZWFyKGZvY3VzZWRQYXJzZWQueWVhcilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoZGVjYWRlQ2hhbmdlZCAmJiBvLm9uQ2hhbmdlRGVjYWRlKSB7XHJcbiAgICAgICAgICAgICAgICBvLm9uQ2hhbmdlRGVjYWRlKHRoaXMuY3VyRGVjYWRlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX3JlZ2lzdGVyS2V5OiBmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICAgICAgICAgIHZhciBleGlzdHMgPSB0aGlzLmtleXMuc29tZShmdW5jdGlvbiAoY3VyS2V5KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gY3VyS2V5ID09IGtleTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIWV4aXN0cykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5rZXlzLnB1c2goa2V5KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX3VuUmVnaXN0ZXJLZXk6IGZ1bmN0aW9uIChrZXkpIHtcclxuICAgICAgICAgICAgdmFyIGluZGV4ID0gdGhpcy5rZXlzLmluZGV4T2Yoa2V5KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMua2V5cy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9pc0hvdEtleVByZXNzZWQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIGN1cnJlbnRIb3RLZXksXHJcbiAgICAgICAgICAgICAgICBmb3VuZCA9IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgICAgICAgICAgcHJlc3NlZEtleXMgPSB0aGlzLmtleXMuc29ydCgpO1xyXG5cclxuICAgICAgICAgICAgZm9yICh2YXIgaG90S2V5IGluIGhvdEtleXMpIHtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRIb3RLZXkgPSBob3RLZXlzW2hvdEtleV07XHJcbiAgICAgICAgICAgICAgICBpZiAocHJlc3NlZEtleXMubGVuZ3RoICE9IGN1cnJlbnRIb3RLZXkubGVuZ3RoKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudEhvdEtleS5ldmVyeShmdW5jdGlvbiAoa2V5LCBpKSB7IHJldHVybiBrZXkgPT0gcHJlc3NlZEtleXNbaV19KSkge1xyXG4gICAgICAgICAgICAgICAgICAgIF90aGlzLl90cmlnZ2VyKCdob3RLZXknLCBob3RLZXkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGZvdW5kO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF90cmlnZ2VyOiBmdW5jdGlvbiAoZXZlbnQsIGFyZ3MpIHtcclxuICAgICAgICAgICAgdGhpcy4kZWwudHJpZ2dlcihldmVudCwgYXJncylcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfZm9jdXNOZXh0Q2VsbDogZnVuY3Rpb24gKGtleUNvZGUsIHR5cGUpIHtcclxuICAgICAgICAgICAgdHlwZSA9IHR5cGUgfHwgdGhpcy5jZWxsVHlwZTtcclxuXHJcbiAgICAgICAgICAgIHZhciBkYXRlID0gZGF0ZXBpY2tlci5nZXRQYXJzZWREYXRlKHRoaXMuX2dldEZvY3VzZWREYXRlKCkpLFxyXG4gICAgICAgICAgICAgICAgeSA9IGRhdGUueWVhcixcclxuICAgICAgICAgICAgICAgIG0gPSBkYXRlLm1vbnRoLFxyXG4gICAgICAgICAgICAgICAgZCA9IGRhdGUuZGF0ZTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9pc0hvdEtleVByZXNzZWQoKSl7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHN3aXRjaChrZXlDb2RlKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDM3OiAvLyBsZWZ0XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9PSAnZGF5JyA/IChkIC09IDEpIDogJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9PSAnbW9udGgnID8gKG0gLT0gMSkgOiAnJztcclxuICAgICAgICAgICAgICAgICAgICB0eXBlID09ICd5ZWFyJyA/ICh5IC09IDEpIDogJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDM4OiAvLyB1cFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPT0gJ2RheScgPyAoZCAtPSA3KSA6ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPT0gJ21vbnRoJyA/IChtIC09IDMpIDogJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9PSAneWVhcicgPyAoeSAtPSA0KSA6ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAzOTogLy8gcmlnaHRcclxuICAgICAgICAgICAgICAgICAgICB0eXBlID09ICdkYXknID8gKGQgKz0gMSkgOiAnJztcclxuICAgICAgICAgICAgICAgICAgICB0eXBlID09ICdtb250aCcgPyAobSArPSAxKSA6ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPT0gJ3llYXInID8gKHkgKz0gMSkgOiAnJztcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgNDA6IC8vIGRvd25cclxuICAgICAgICAgICAgICAgICAgICB0eXBlID09ICdkYXknID8gKGQgKz0gNykgOiAnJztcclxuICAgICAgICAgICAgICAgICAgICB0eXBlID09ICdtb250aCcgPyAobSArPSAzKSA6ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPT0gJ3llYXInID8gKHkgKz0gNCkgOiAnJztcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdmFyIG5kID0gbmV3IERhdGUoeSxtLGQpO1xyXG4gICAgICAgICAgICBpZiAobmQuZ2V0VGltZSgpIDwgdGhpcy5taW5UaW1lKSB7XHJcbiAgICAgICAgICAgICAgICBuZCA9IHRoaXMubWluRGF0ZTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChuZC5nZXRUaW1lKCkgPiB0aGlzLm1heFRpbWUpIHtcclxuICAgICAgICAgICAgICAgIG5kID0gdGhpcy5tYXhEYXRlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmZvY3VzZWQgPSBuZDtcclxuXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2dldEZvY3VzZWREYXRlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHZhciBmb2N1c2VkICA9IHRoaXMuZm9jdXNlZCB8fCB0aGlzLnNlbGVjdGVkRGF0ZXNbdGhpcy5zZWxlY3RlZERhdGVzLmxlbmd0aCAtIDFdLFxyXG4gICAgICAgICAgICAgICAgZCA9IHRoaXMucGFyc2VkRGF0ZTtcclxuXHJcbiAgICAgICAgICAgIGlmICghZm9jdXNlZCkge1xyXG4gICAgICAgICAgICAgICAgc3dpdGNoICh0aGlzLnZpZXcpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICdkYXlzJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9jdXNlZCA9IG5ldyBEYXRlKGQueWVhciwgZC5tb250aCwgbmV3IERhdGUoKS5nZXREYXRlKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICdtb250aHMnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb2N1c2VkID0gbmV3IERhdGUoZC55ZWFyLCBkLm1vbnRoLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAneWVhcnMnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb2N1c2VkID0gbmV3IERhdGUoZC55ZWFyLCAwLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBmb2N1c2VkO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9nZXRDZWxsOiBmdW5jdGlvbiAoZGF0ZSwgdHlwZSkge1xyXG4gICAgICAgICAgICB0eXBlID0gdHlwZSB8fCB0aGlzLmNlbGxUeXBlO1xyXG5cclxuICAgICAgICAgICAgdmFyIGQgPSBkYXRlcGlja2VyLmdldFBhcnNlZERhdGUoZGF0ZSksXHJcbiAgICAgICAgICAgICAgICBzZWxlY3RvciA9ICcuZGF0ZXBpY2tlci0tY2VsbFtkYXRhLXllYXI9XCInICsgZC55ZWFyICsgJ1wiXScsXHJcbiAgICAgICAgICAgICAgICAkY2VsbDtcclxuXHJcbiAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnbW9udGgnOlxyXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yID0gJ1tkYXRhLW1vbnRoPVwiJyArIGQubW9udGggKyAnXCJdJztcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ2RheSc6XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0b3IgKz0gJ1tkYXRhLW1vbnRoPVwiJyArIGQubW9udGggKyAnXCJdW2RhdGEtZGF0ZT1cIicgKyBkLmRhdGUgKyAnXCJdJztcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAkY2VsbCA9IHRoaXMuJGVsLmZpbmQoc2VsZWN0b3IpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuICRjZWxsLmxlbmd0aCA/ICRjZWxsIDogJCgnJyk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZGVzdHJveTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgICAgICBfdGhpcy4kZWxcclxuICAgICAgICAgICAgICAgIC5vZmYoJy5hZHAnKVxyXG4gICAgICAgICAgICAgICAgLmRhdGEoJ2RhdGVwaWNrZXInLCAnJyk7XHJcblxyXG4gICAgICAgICAgICBfdGhpcy5zZWxlY3RlZERhdGVzID0gW107XHJcbiAgICAgICAgICAgIF90aGlzLmZvY3VzZWQgPSAnJztcclxuICAgICAgICAgICAgX3RoaXMudmlld3MgPSB7fTtcclxuICAgICAgICAgICAgX3RoaXMua2V5cyA9IFtdO1xyXG4gICAgICAgICAgICBfdGhpcy5taW5SYW5nZSA9ICcnO1xyXG4gICAgICAgICAgICBfdGhpcy5tYXhSYW5nZSA9ICcnO1xyXG5cclxuICAgICAgICAgICAgaWYgKF90aGlzLm9wdHMuaW5saW5lIHx8ICFfdGhpcy5lbElzSW5wdXQpIHtcclxuICAgICAgICAgICAgICAgIF90aGlzLiRkYXRlcGlja2VyLmNsb3Nlc3QoJy5kYXRlcGlja2VyLWlubGluZScpLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuJGRhdGVwaWNrZXIucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfaGFuZGxlQWxyZWFkeVNlbGVjdGVkRGF0ZXM6IGZ1bmN0aW9uIChhbHJlYWR5U2VsZWN0ZWQsIHNlbGVjdGVkRGF0ZSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRzLnJhbmdlKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMub3B0cy50b2dnbGVTZWxlY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBwb3NzaWJpbGl0eSB0byBzZWxlY3Qgc2FtZSBkYXRlIHdoZW4gcmFuZ2UgaXMgdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnNlbGVjdGVkRGF0ZXMubGVuZ3RoICE9IDIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fdHJpZ2dlcignY2xpY2tDZWxsJywgc2VsZWN0ZWREYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlRGF0ZShzZWxlY3RlZERhdGUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMub3B0cy50b2dnbGVTZWxlY3RlZCl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZURhdGUoc2VsZWN0ZWREYXRlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gQ2hhbmdlIGxhc3Qgc2VsZWN0ZWQgZGF0ZSB0byBiZSBhYmxlIHRvIGNoYW5nZSB0aW1lIHdoZW4gY2xpY2tpbmcgb24gdGhpcyBjZWxsXHJcbiAgICAgICAgICAgIGlmICghdGhpcy5vcHRzLnRvZ2dsZVNlbGVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxhc3RTZWxlY3RlZERhdGUgPSBhbHJlYWR5U2VsZWN0ZWQ7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRzLnRpbWVwaWNrZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVwaWNrZXIuX3NldFRpbWUoYWxyZWFkeVNlbGVjdGVkKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVwaWNrZXIudXBkYXRlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfb25TaG93RXZlbnQ6IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy52aXNpYmxlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNob3coKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9vbkJsdXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmluRm9jdXMgJiYgdGhpcy52aXNpYmxlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9vbk1vdXNlRG93bkRhdGVwaWNrZXI6IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5Gb2N1cyA9IHRydWU7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX29uTW91c2VVcERhdGVwaWNrZXI6IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5Gb2N1cyA9IGZhbHNlO1xyXG4gICAgICAgICAgICBlLm9yaWdpbmFsRXZlbnQuaW5Gb2N1cyA9IHRydWU7XHJcbiAgICAgICAgICAgIGlmICghZS5vcmlnaW5hbEV2ZW50LnRpbWVwaWNrZXJGb2N1cykgdGhpcy4kZWwuZm9jdXMoKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfb25LZXlVcEdlbmVyYWw6IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgIHZhciB2YWwgPSB0aGlzLiRlbC52YWwoKTtcclxuXHJcbiAgICAgICAgICAgIGlmICghdmFsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfb25SZXNpemU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMudmlzaWJsZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX29uTW91c2VVcEJvZHk6IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgIGlmIChlLm9yaWdpbmFsRXZlbnQuaW5Gb2N1cykgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMudmlzaWJsZSAmJiAhdGhpcy5pbkZvY3VzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9vbk1vdXNlVXBFbDogZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgZS5vcmlnaW5hbEV2ZW50LmluRm9jdXMgPSB0cnVlO1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KHRoaXMuX29uS2V5VXBHZW5lcmFsLmJpbmQodGhpcyksNCk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX29uS2V5RG93bjogZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgdmFyIGNvZGUgPSBlLndoaWNoO1xyXG4gICAgICAgICAgICB0aGlzLl9yZWdpc3RlcktleShjb2RlKTtcclxuXHJcbiAgICAgICAgICAgIC8vIEFycm93c1xyXG4gICAgICAgICAgICBpZiAoY29kZSA+PSAzNyAmJiBjb2RlIDw9IDQwKSB7XHJcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9mb2N1c05leHRDZWxsKGNvZGUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBFbnRlclxyXG4gICAgICAgICAgICBpZiAoY29kZSA9PSAxMykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZm9jdXNlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLl9nZXRDZWxsKHRoaXMuZm9jdXNlZCkuaGFzQ2xhc3MoJy1kaXNhYmxlZC0nKSkgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnZpZXcgIT0gdGhpcy5vcHRzLm1pblZpZXcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kb3duKClcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYWxyZWFkeVNlbGVjdGVkID0gdGhpcy5faXNTZWxlY3RlZCh0aGlzLmZvY3VzZWQsIHRoaXMuY2VsbFR5cGUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFhbHJlYWR5U2VsZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRpbWVwaWNrZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZvY3VzZWQuc2V0SG91cnModGhpcy50aW1lcGlja2VyLmhvdXJzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZvY3VzZWQuc2V0TWludXRlcyh0aGlzLnRpbWVwaWNrZXIubWludXRlcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdERhdGUodGhpcy5mb2N1c2VkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9oYW5kbGVBbHJlYWR5U2VsZWN0ZWREYXRlcyhhbHJlYWR5U2VsZWN0ZWQsIHRoaXMuZm9jdXNlZClcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIEVzY1xyXG4gICAgICAgICAgICBpZiAoY29kZSA9PSAyNykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfb25LZXlVcDogZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgdmFyIGNvZGUgPSBlLndoaWNoO1xyXG4gICAgICAgICAgICB0aGlzLl91blJlZ2lzdGVyS2V5KGNvZGUpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9vbkhvdEtleTogZnVuY3Rpb24gKGUsIGhvdEtleSkge1xyXG4gICAgICAgICAgICB0aGlzLl9oYW5kbGVIb3RLZXkoaG90S2V5KTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfb25Nb3VzZUVudGVyQ2VsbDogZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgdmFyICRjZWxsID0gJChlLnRhcmdldCkuY2xvc2VzdCgnLmRhdGVwaWNrZXItLWNlbGwnKSxcclxuICAgICAgICAgICAgICAgIGRhdGUgPSB0aGlzLl9nZXREYXRlRnJvbUNlbGwoJGNlbGwpO1xyXG5cclxuICAgICAgICAgICAgLy8gUHJldmVudCBmcm9tIHVubmVjZXNzYXJ5IHJlbmRlcmluZyBhbmQgc2V0dGluZyBuZXcgY3VycmVudERhdGVcclxuICAgICAgICAgICAgdGhpcy5zaWxlbnQgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuZm9jdXNlZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5mb2N1c2VkID0gJydcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgJGNlbGwuYWRkQ2xhc3MoJy1mb2N1cy0nKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZm9jdXNlZCA9IGRhdGU7XHJcbiAgICAgICAgICAgIHRoaXMuc2lsZW50ID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRzLnJhbmdlICYmIHRoaXMuc2VsZWN0ZWREYXRlcy5sZW5ndGggPT0gMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5taW5SYW5nZSA9IHRoaXMuc2VsZWN0ZWREYXRlc1swXTtcclxuICAgICAgICAgICAgICAgIHRoaXMubWF4UmFuZ2UgPSAnJztcclxuICAgICAgICAgICAgICAgIGlmIChkYXRlcGlja2VyLmxlc3ModGhpcy5taW5SYW5nZSwgdGhpcy5mb2N1c2VkKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWF4UmFuZ2UgPSB0aGlzLm1pblJhbmdlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWluUmFuZ2UgPSAnJztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoaXMuX2xvb3Blcih0aGlzLnZpZXdzW3RoaXMuY3VycmVudFZpZXddLCAnX3VwZGF0ZScpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX29uTW91c2VMZWF2ZUNlbGw6IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgIHZhciAkY2VsbCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJy5kYXRlcGlja2VyLS1jZWxsJyk7XHJcblxyXG4gICAgICAgICAgICAkY2VsbC5yZW1vdmVDbGFzcygnLWZvY3VzLScpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zaWxlbnQgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLmZvY3VzZWQgPSAnJztcclxuICAgICAgICAgICAgdGhpcy5zaWxlbnQgPSBmYWxzZTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfb25UaW1lQ2hhbmdlOiBmdW5jdGlvbiAoZSwgaCwgbSkge1xyXG4gICAgICAgICAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlKCksXHJcbiAgICAgICAgICAgICAgICBzZWxlY3RlZERhdGVzID0gdGhpcy5zZWxlY3RlZERhdGVzLFxyXG4gICAgICAgICAgICAgICAgc2VsZWN0ZWQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgIGlmIChzZWxlY3RlZERhdGVzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgc2VsZWN0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgZGF0ZSA9IHRoaXMubGFzdFNlbGVjdGVkRGF0ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZGF0ZS5zZXRIb3VycyhoKTtcclxuICAgICAgICAgICAgZGF0ZS5zZXRNaW51dGVzKG0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFzZWxlY3RlZCAmJiAhdGhpcy5fZ2V0Q2VsbChkYXRlKS5oYXNDbGFzcygnLWRpc2FibGVkLScpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdERhdGUoZGF0ZSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9zZXRJbnB1dFZhbHVlKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRzLm9uU2VsZWN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fdHJpZ2dlck9uQ2hhbmdlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfb25DbGlja0NlbGw6IGZ1bmN0aW9uIChlLCBkYXRlKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnRpbWVwaWNrZXIpIHtcclxuICAgICAgICAgICAgICAgIGRhdGUuc2V0SG91cnModGhpcy50aW1lcGlja2VyLmhvdXJzKTtcclxuICAgICAgICAgICAgICAgIGRhdGUuc2V0TWludXRlcyh0aGlzLnRpbWVwaWNrZXIubWludXRlcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5zZWxlY3REYXRlKGRhdGUpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9sb29wZXI6IGZ1bmN0aW9uIChhcnIsIG1ldGhvZCkge1xyXG4gICAgICAgICAgIGFyci5mb3JFYWNoKGZ1bmN0aW9uIChlbCkge1xyXG4gICAgICAgICAgICAgICBlbFttZXRob2RdKCk7XHJcbiAgICAgICAgICAgfSlcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfbG9vcFBhcnRzOiBmdW5jdGlvbiAoYXJyLCBvYmplY3QpIHtcclxuICAgICAgICAgICAgdmFyIGkgPSAwLFxyXG4gICAgICAgICAgICAgICAgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcclxuXHJcblxyXG4gICAgICAgICAgICAvLyBQdXNoIGluaXRpYWwgaW5kZXhcclxuICAgICAgICAgICAgYXJncy5wdXNoKDApO1xyXG5cclxuICAgICAgICAgICAgd2hpbGUoaSA8IHRoaXMub3B0cy5jYWxlbmRhcnMpIHtcclxuICAgICAgICAgICAgICAgIGFyZ3NbYXJncy5sZW5ndGggLSAxXSA9IGk7XHJcbiAgICAgICAgICAgICAgICB2YXIgRiA9IG9iamVjdC5iaW5kLmFwcGx5KG9iamVjdCwgYXJncyk7XHJcbiAgICAgICAgICAgICAgICBhcnIucHVzaChuZXcgRigpKTtcclxuICAgICAgICAgICAgICAgIGkrKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHNldCBmb2N1c2VkKHZhbCkge1xyXG4gICAgICAgICAgICBpZiAoIXZhbCAmJiB0aGlzLmZvY3VzZWQpIHtcclxuICAgICAgICAgICAgICAgIHZhciAkY2VsbCA9IHRoaXMuX2dldENlbGwodGhpcy5mb2N1c2VkKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoJGNlbGwubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJGNlbGwucmVtb3ZlQ2xhc3MoJy1mb2N1cy0nKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuX2ZvY3VzZWQgPSB2YWw7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdHMucmFuZ2UgJiYgdGhpcy5zZWxlY3RlZERhdGVzLmxlbmd0aCA9PSAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1pblJhbmdlID0gdGhpcy5zZWxlY3RlZERhdGVzWzBdO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tYXhSYW5nZSA9ICcnO1xyXG4gICAgICAgICAgICAgICAgaWYgKGRhdGVwaWNrZXIubGVzcyh0aGlzLm1pblJhbmdlLCB0aGlzLl9mb2N1c2VkKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWF4UmFuZ2UgPSB0aGlzLm1pblJhbmdlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWluUmFuZ2UgPSAnJztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5zaWxlbnQpIHJldHVybjtcclxuICAgICAgICAgICAgdGhpcy5kYXRlID0gdmFsO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGdldCBmb2N1c2VkKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZm9jdXNlZDtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBnZXQgcGFyc2VkRGF0ZSgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGRhdGVwaWNrZXIuZ2V0UGFyc2VkRGF0ZSh0aGlzLmRhdGUpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHNldCBkYXRlICh2YWwpIHtcclxuICAgICAgICAgICAgaWYgKCEodmFsIGluc3RhbmNlb2YgRGF0ZSkpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudERhdGUgPSB2YWw7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5pbml0ZWQgJiYgIXRoaXMuc2lsZW50KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9sb29wZXIodGhpcy52aWV3c1t0aGlzLnZpZXddLCAnX3JlbmRlcicpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uYXYuX3JlbmRlcigpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudmlzaWJsZSAmJiB0aGlzLmVsSXNJbnB1dCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0UG9zaXRpb24oKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdmFsO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGdldCBkYXRlICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3VycmVudERhdGVcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBzZXQgdmlldyAodmFsKSB7XHJcbiAgICAgICAgICAgIHRoaXMudmlld0luZGV4ID0gdGhpcy52aWV3SW5kZXhlcy5pbmRleE9mKHZhbCk7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy52aWV3SW5kZXggPCAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMucHJldlZpZXcgPSB0aGlzLmN1cnJlbnRWaWV3O1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRWaWV3ID0gdmFsO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuaW5pdGVkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMudmlld3NbdmFsXSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmlld3NbdmFsXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2xvb3BQYXJ0cyh0aGlzLnZpZXdzW3ZhbF0sICQuZm4uZGF0ZXBpY2tlci5Cb2R5LCB0aGlzLCB2YWwsIHRoaXMub3B0cyk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2xvb3Blcih0aGlzLnZpZXdzW3ZhbF0sICdfcmVuZGVyJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5fbG9vcGVyKHRoaXMudmlld3NbdGhpcy5wcmV2Vmlld10sICdoaWRlJyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9sb29wZXIodGhpcy52aWV3c1t2YWxdLCAnc2hvdycpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uYXYuX3JlbmRlcigpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9wdHMub25DaGFuZ2VWaWV3KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vcHRzLm9uQ2hhbmdlVmlldyh2YWwpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5lbElzSW5wdXQgJiYgdGhpcy52aXNpYmxlKSB0aGlzLnNldFBvc2l0aW9uKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB2YWxcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBnZXQgdmlldygpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3VycmVudFZpZXc7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZ2V0IGNlbGxUeXBlKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy52aWV3LnN1YnN0cmluZygwLCB0aGlzLnZpZXcubGVuZ3RoIC0gMSlcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBnZXQgbWluVGltZSgpIHtcclxuICAgICAgICAgICAgdmFyIG1pbiA9IGRhdGVwaWNrZXIuZ2V0UGFyc2VkRGF0ZSh0aGlzLm1pbkRhdGUpO1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IERhdGUobWluLnllYXIsIG1pbi5tb250aCwgbWluLmRhdGUpLmdldFRpbWUoKVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGdldCBtYXhUaW1lKCkge1xyXG4gICAgICAgICAgICB2YXIgbWF4ID0gZGF0ZXBpY2tlci5nZXRQYXJzZWREYXRlKHRoaXMubWF4RGF0ZSk7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgRGF0ZShtYXgueWVhciwgbWF4Lm1vbnRoLCBtYXguZGF0ZSkuZ2V0VGltZSgpXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZ2V0IGN1ckRlY2FkZSgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGRhdGVwaWNrZXIuZ2V0RGVjYWRlKHRoaXMuZGF0ZSlcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIC8vICBVdGlsc1xyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIGRhdGVwaWNrZXIuZ2V0RGF5c0NvdW50ID0gZnVuY3Rpb24gKGRhdGUpIHtcclxuICAgICAgICByZXR1cm4gbmV3IERhdGUoZGF0ZS5nZXRGdWxsWWVhcigpLCBkYXRlLmdldE1vbnRoKCkgKyAxLCAwKS5nZXREYXRlKCk7XHJcbiAgICB9O1xyXG5cclxuICAgIGRhdGVwaWNrZXIuZ2V0UGFyc2VkRGF0ZSA9IGZ1bmN0aW9uIChkYXRlKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgeWVhcjogZGF0ZS5nZXRGdWxsWWVhcigpLFxyXG4gICAgICAgICAgICBtb250aDogZGF0ZS5nZXRNb250aCgpLFxyXG4gICAgICAgICAgICBmdWxsTW9udGg6IChkYXRlLmdldE1vbnRoKCkgKyAxKSA8IDEwID8gJzAnICsgKGRhdGUuZ2V0TW9udGgoKSArIDEpIDogZGF0ZS5nZXRNb250aCgpICsgMSwgLy8gT25lIGJhc2VkXHJcbiAgICAgICAgICAgIGRhdGU6IGRhdGUuZ2V0RGF0ZSgpLFxyXG4gICAgICAgICAgICBmdWxsRGF0ZTogZGF0ZS5nZXREYXRlKCkgPCAxMCA/ICcwJyArIGRhdGUuZ2V0RGF0ZSgpIDogZGF0ZS5nZXREYXRlKCksXHJcbiAgICAgICAgICAgIGRheTogZGF0ZS5nZXREYXkoKSxcclxuICAgICAgICAgICAgaG91cnM6IGRhdGUuZ2V0SG91cnMoKSxcclxuICAgICAgICAgICAgZnVsbEhvdXJzOiAgZGF0ZS5nZXRIb3VycygpIDwgMTAgPyAnMCcgKyBkYXRlLmdldEhvdXJzKCkgOiAgZGF0ZS5nZXRIb3VycygpICxcclxuICAgICAgICAgICAgbWludXRlczogZGF0ZS5nZXRNaW51dGVzKCksXHJcbiAgICAgICAgICAgIGZ1bGxNaW51dGVzOiAgZGF0ZS5nZXRNaW51dGVzKCkgPCAxMCA/ICcwJyArIGRhdGUuZ2V0TWludXRlcygpIDogIGRhdGUuZ2V0TWludXRlcygpXHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBkYXRlcGlja2VyLmdldERlY2FkZSA9IGZ1bmN0aW9uIChkYXRlKSB7XHJcbiAgICAgICAgdmFyIGZpcnN0WWVhciA9IE1hdGguZmxvb3IoZGF0ZS5nZXRGdWxsWWVhcigpIC8gMTApICogMTA7XHJcblxyXG4gICAgICAgIHJldHVybiBbZmlyc3RZZWFyLCBmaXJzdFllYXIgKyA5XTtcclxuICAgIH07XHJcblxyXG4gICAgZGF0ZXBpY2tlci50ZW1wbGF0ZSA9IGZ1bmN0aW9uIChzdHIsIGRhdGEpIHtcclxuICAgICAgICByZXR1cm4gc3RyLnJlcGxhY2UoLyNcXHsoW1xcd10rKVxcfS9nLCBmdW5jdGlvbiAoc291cmNlLCBtYXRjaCkge1xyXG4gICAgICAgICAgICBpZiAoZGF0YVttYXRjaF0gfHwgZGF0YVttYXRjaF0gPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhW21hdGNoXVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG5cclxuICAgIGRhdGVwaWNrZXIuaXNTYW1lID0gZnVuY3Rpb24gKGRhdGUxLCBkYXRlMiwgdHlwZSkge1xyXG4gICAgICAgIGlmICghZGF0ZTEgfHwgIWRhdGUyKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgdmFyIGQxID0gZGF0ZXBpY2tlci5nZXRQYXJzZWREYXRlKGRhdGUxKSxcclxuICAgICAgICAgICAgZDIgPSBkYXRlcGlja2VyLmdldFBhcnNlZERhdGUoZGF0ZTIpLFxyXG4gICAgICAgICAgICBfdHlwZSA9IHR5cGUgPyB0eXBlIDogJ2RheScsXHJcblxyXG4gICAgICAgICAgICBjb25kaXRpb25zID0ge1xyXG4gICAgICAgICAgICAgICAgZGF5OiBkMS5kYXRlID09IGQyLmRhdGUgJiYgZDEubW9udGggPT0gZDIubW9udGggJiYgZDEueWVhciA9PSBkMi55ZWFyLFxyXG4gICAgICAgICAgICAgICAgbW9udGg6IGQxLm1vbnRoID09IGQyLm1vbnRoICYmIGQxLnllYXIgPT0gZDIueWVhcixcclxuICAgICAgICAgICAgICAgIHllYXI6IGQxLnllYXIgPT0gZDIueWVhclxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICByZXR1cm4gY29uZGl0aW9uc1tfdHlwZV07XHJcbiAgICB9O1xyXG5cclxuICAgIGRhdGVwaWNrZXIubGVzcyA9IGZ1bmN0aW9uIChkYXRlQ29tcGFyZVRvLCBkYXRlLCB0eXBlKSB7XHJcbiAgICAgICAgaWYgKCFkYXRlQ29tcGFyZVRvIHx8ICFkYXRlKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgcmV0dXJuIGRhdGUuZ2V0VGltZSgpIDwgZGF0ZUNvbXBhcmVUby5nZXRUaW1lKCk7XHJcbiAgICB9O1xyXG5cclxuICAgIGRhdGVwaWNrZXIuYmlnZ2VyID0gZnVuY3Rpb24gKGRhdGVDb21wYXJlVG8sIGRhdGUsIHR5cGUpIHtcclxuICAgICAgICBpZiAoIWRhdGVDb21wYXJlVG8gfHwgIWRhdGUpIHJldHVybiBmYWxzZTtcclxuICAgICAgICByZXR1cm4gZGF0ZS5nZXRUaW1lKCkgPiBkYXRlQ29tcGFyZVRvLmdldFRpbWUoKTtcclxuICAgIH07XHJcblxyXG4gICAgZGF0ZXBpY2tlci5nZXRMZWFkaW5nWmVyb051bSA9IGZ1bmN0aW9uIChudW0pIHtcclxuICAgICAgICByZXR1cm4gcGFyc2VJbnQobnVtKSA8IDEwID8gJzAnICsgbnVtIDogbnVtO1xyXG4gICAgfTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFJldHVybnMgY29weSBvZiBkYXRlIHdpdGggaG91cnMgYW5kIG1pbnV0ZXMgZXF1YWxzIHRvIDBcclxuICAgICAqIEBwYXJhbSBkYXRlIHtEYXRlfVxyXG4gICAgICovXHJcbiAgICBkYXRlcGlja2VyLnJlc2V0VGltZSA9IGZ1bmN0aW9uIChkYXRlKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlICE9ICdvYmplY3QnKSByZXR1cm47XHJcbiAgICAgICAgZGF0ZSA9IGRhdGVwaWNrZXIuZ2V0UGFyc2VkRGF0ZShkYXRlKTtcclxuICAgICAgICByZXR1cm4gbmV3IERhdGUoZGF0ZS55ZWFyLCBkYXRlLm1vbnRoLCBkYXRlLmRhdGUpXHJcbiAgICB9O1xyXG5cclxuICAgICQuZm4uZGF0ZXBpY2tlciA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKCEkLmRhdGEodGhpcywgcGx1Z2luTmFtZSkpIHtcclxuICAgICAgICAgICAgICAgICQuZGF0YSh0aGlzLCAgcGx1Z2luTmFtZSxcclxuICAgICAgICAgICAgICAgICAgICBuZXcgRGF0ZXBpY2tlciggdGhpcywgb3B0aW9ucyApKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHZhciBfdGhpcyA9ICQuZGF0YSh0aGlzLCBwbHVnaW5OYW1lKTtcclxuXHJcbiAgICAgICAgICAgICAgICBfdGhpcy5vcHRzID0gJC5leHRlbmQodHJ1ZSwgX3RoaXMub3B0cywgb3B0aW9ucyk7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy51cGRhdGUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuXHJcbiAgICAkLmZuLmRhdGVwaWNrZXIuQ29uc3RydWN0b3IgPSBEYXRlcGlja2VyO1xyXG5cclxuICAgICQuZm4uZGF0ZXBpY2tlci5sYW5ndWFnZSA9IHtcclxuICAgICAgICBydToge1xyXG4gICAgICAgICAgICBkYXlzOiBbJ9CS0L7RgdC60YDQtdGB0LXQvdGM0LUnLCAn0J/QvtC90LXQtNC10LvRjNC90LjQuicsICfQktGC0L7RgNC90LjQuicsICfQodGA0LXQtNCwJywgJ9Cn0LXRgtCy0LXRgNCzJywgJ9Cf0Y/RgtC90LjRhtCwJywgJ9Ch0YPQsdCx0L7RgtCwJ10sXHJcbiAgICAgICAgICAgIGRheXNTaG9ydDogWyfQktC+0YEnLCfQn9C+0L0nLCfQktGC0L4nLCfQodGA0LUnLCfQp9C10YInLCfQn9GP0YInLCfQodGD0LEnXSxcclxuICAgICAgICAgICAgZGF5c01pbjogWyfQktGBJywn0J/QvScsJ9CS0YInLCfQodGAJywn0KfRgicsJ9Cf0YInLCfQodCxJ10sXHJcbiAgICAgICAgICAgIG1vbnRoczogWyfQr9C90LLQsNGA0YwnLCAn0KTQtdCy0YDQsNC70YwnLCAn0JzQsNGA0YInLCAn0JDQv9GA0LXQu9GMJywgJ9Cc0LDQuScsICfQmNGO0L3RjCcsICfQmNGO0LvRjCcsICfQkNCy0LPRg9GB0YInLCAn0KHQtdC90YLRj9Cx0YDRjCcsICfQntC60YLRj9Cx0YDRjCcsICfQndC+0Y/QsdGA0YwnLCAn0JTQtdC60LDQsdGA0YwnXSxcclxuICAgICAgICAgICAgbW9udGhzU2hvcnQ6IFsn0K/QvdCyJywgJ9Ck0LXQsicsICfQnNCw0YAnLCAn0JDQv9GAJywgJ9Cc0LDQuScsICfQmNGO0L0nLCAn0JjRjtC7JywgJ9CQ0LLQsycsICfQodC10L0nLCAn0J7QutGCJywgJ9Cd0L7RjycsICfQlNC10LonXSxcclxuICAgICAgICAgICAgdG9kYXk6ICfQodC10LPQvtC00L3RjycsXHJcbiAgICAgICAgICAgIGNsZWFyOiAn0J7Rh9C40YHRgtC40YLRjCcsXHJcbiAgICAgICAgICAgIGRhdGVGb3JtYXQ6ICdkZC5tbS55eXl5JyxcclxuICAgICAgICAgICAgdGltZUZvcm1hdDogJ2hoOmlpJyxcclxuICAgICAgICAgICAgZmlyc3REYXk6IDFcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgICQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICQoYXV0b0luaXRTZWxlY3RvcikuZGF0ZXBpY2tlcigpO1xyXG4gICAgfSlcclxuXHJcbn0pKCk7XHJcbiIsIjsoZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHRlbXBsYXRlcyA9IHtcclxuICAgICAgICBkYXlzOicnICtcclxuICAgICAgICAnPGRpdiBjbGFzcz1cImRhdGVwaWNrZXItLWRheXMgZGF0ZXBpY2tlci0tYm9keVwiPicgK1xyXG4gICAgICAgICc8ZGl2IGNsYXNzPVwiZGF0ZXBpY2tlci0tZGF5cy1uYW1lc1wiPjwvZGl2PicgK1xyXG4gICAgICAgICc8ZGl2IGNsYXNzPVwiZGF0ZXBpY2tlci0tY2VsbHMgZGF0ZXBpY2tlci0tY2VsbHMtZGF5c1wiPjwvZGl2PicgK1xyXG4gICAgICAgICc8L2Rpdj4nLFxyXG4gICAgICAgIG1vbnRoczogJycgK1xyXG4gICAgICAgICc8ZGl2IGNsYXNzPVwiZGF0ZXBpY2tlci0tbW9udGhzIGRhdGVwaWNrZXItLWJvZHlcIj4nICtcclxuICAgICAgICAnPGRpdiBjbGFzcz1cImRhdGVwaWNrZXItLWNlbGxzIGRhdGVwaWNrZXItLWNlbGxzLW1vbnRoc1wiPjwvZGl2PicgK1xyXG4gICAgICAgICc8L2Rpdj4nLFxyXG4gICAgICAgIHllYXJzOiAnJyArXHJcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJkYXRlcGlja2VyLS15ZWFycyBkYXRlcGlja2VyLS1ib2R5XCI+JyArXHJcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJkYXRlcGlja2VyLS1jZWxscyBkYXRlcGlja2VyLS1jZWxscy15ZWFyc1wiPjwvZGl2PicgK1xyXG4gICAgICAgICc8L2Rpdj4nXHJcbiAgICAgICAgfSxcclxuICAgICAgICBkYXRlcGlja2VyID0gJC5mbi5kYXRlcGlja2VyLFxyXG4gICAgICAgIGRwID0gZGF0ZXBpY2tlci5Db25zdHJ1Y3RvcjtcclxuXHJcbiAgICBkYXRlcGlja2VyLkJvZHkgPSBmdW5jdGlvbiAoZCwgdHlwZSwgb3B0cywgaW5kZXgpIHtcclxuICAgICAgICB0aGlzLmQgPSBkO1xyXG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XHJcbiAgICAgICAgdGhpcy5vcHRzID0gb3B0cztcclxuICAgICAgICB0aGlzLiRlbCA9ICQoJycpO1xyXG4gICAgICAgIHRoaXMuaW5kZXggPSBpbmRleDtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMub3B0cy5vbmx5VGltZXBpY2tlcikgcmV0dXJuO1xyXG4gICAgICAgIHRoaXMuaW5pdCgpO1xyXG4gICAgfTtcclxuXHJcbiAgICBkYXRlcGlja2VyLkJvZHkucHJvdG90eXBlID0ge1xyXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGhpcy5fYnVpbGRCYXNlSHRtbCgpO1xyXG4gICAgICAgICAgICB0aGlzLl9yZW5kZXIoKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuX2JpbmRFdmVudHMoKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfYmluZEV2ZW50czogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0aGlzLiRlbC5vbignY2xpY2snLCAnLmRhdGVwaWNrZXItLWNlbGwnLCAkLnByb3h5KHRoaXMuX29uQ2xpY2tDZWxsLCB0aGlzKSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2J1aWxkQmFzZUh0bWw6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGhpcy4kZWwgPSAkKHRlbXBsYXRlc1t0aGlzLnR5cGVdKS5hcHBlbmRUbyh0aGlzLmQuJGNvbnRlbnQpO1xyXG4gICAgICAgICAgICB0aGlzLiRuYW1lcyA9ICQoJy5kYXRlcGlja2VyLS1kYXlzLW5hbWVzJywgdGhpcy4kZWwpO1xyXG4gICAgICAgICAgICB0aGlzLiRjZWxscyA9ICQoJy5kYXRlcGlja2VyLS1jZWxscycsIHRoaXMuJGVsKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfZ2V0RGF5TmFtZXNIdG1sOiBmdW5jdGlvbiAoZmlyc3REYXksIGN1ckRheSwgaHRtbCwgaSkge1xyXG4gICAgICAgICAgICBjdXJEYXkgPSBjdXJEYXkgIT0gdW5kZWZpbmVkID8gY3VyRGF5IDogZmlyc3REYXk7XHJcbiAgICAgICAgICAgIGh0bWwgPSBodG1sID8gaHRtbCA6ICcnO1xyXG4gICAgICAgICAgICBpID0gaSAhPSB1bmRlZmluZWQgPyBpIDogMDtcclxuXHJcbiAgICAgICAgICAgIGlmIChpID4gNykgcmV0dXJuIGh0bWw7XHJcbiAgICAgICAgICAgIGlmIChjdXJEYXkgPT0gNykgcmV0dXJuIHRoaXMuX2dldERheU5hbWVzSHRtbChmaXJzdERheSwgMCwgaHRtbCwgKytpKTtcclxuXHJcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJkYXRlcGlja2VyLS1kYXktbmFtZScgKyAodGhpcy5kLmlzV2Vla2VuZChjdXJEYXkpID8gXCIgLXdlZWtlbmQtXCIgOiBcIlwiKSArICdcIj4nICsgdGhpcy5kLmxvYy5kYXlzTWluW2N1ckRheV0gKyAnPC9kaXY+JztcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9nZXREYXlOYW1lc0h0bWwoZmlyc3REYXksICsrY3VyRGF5LCBodG1sLCArK2kpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9nZXRDZWxsQ29udGVudHM6IGZ1bmN0aW9uIChkYXRlLCB0eXBlKSB7XHJcbiAgICAgICAgICAgIHZhciBjbGFzc2VzID0gXCJkYXRlcGlja2VyLS1jZWxsIGRhdGVwaWNrZXItLWNlbGwtXCIgKyB0eXBlLFxyXG4gICAgICAgICAgICAgICAgY3VycmVudERhdGUgPSBuZXcgRGF0ZSgpLFxyXG4gICAgICAgICAgICAgICAgcGFyZW50ID0gdGhpcy5kLFxyXG4gICAgICAgICAgICAgICAgbWluUmFuZ2UgPSBkcC5yZXNldFRpbWUocGFyZW50Lm1pblJhbmdlKSxcclxuICAgICAgICAgICAgICAgIG1heFJhbmdlID0gZHAucmVzZXRUaW1lKHBhcmVudC5tYXhSYW5nZSksXHJcbiAgICAgICAgICAgICAgICBvcHRzID0gcGFyZW50Lm9wdHMsXHJcbiAgICAgICAgICAgICAgICBkID0gZHAuZ2V0UGFyc2VkRGF0ZShkYXRlKSxcclxuICAgICAgICAgICAgICAgIHJlbmRlciA9IHt9LFxyXG4gICAgICAgICAgICAgICAgaHRtbCA9IGQuZGF0ZTtcclxuXHJcbiAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnZGF5JzpcclxuICAgICAgICAgICAgICAgICAgICBpZiAocGFyZW50LmlzV2Vla2VuZChkLmRheSkpIGNsYXNzZXMgKz0gXCIgLXdlZWtlbmQtXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGQubW9udGggIT0gdGhpcy5sb2NhbFZpZXdEYXRlLm1vbnRoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzZXMgKz0gXCIgLW90aGVyLW1vbnRoLVwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW9wdHMuc2VsZWN0T3RoZXJNb250aHMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzZXMgKz0gXCIgLWRpc2FibGVkLVwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghb3B0cy5zaG93T3RoZXJNb250aHMpIGh0bWwgPSAnJztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdtb250aCc6XHJcbiAgICAgICAgICAgICAgICAgICAgaHRtbCA9IHBhcmVudC5sb2NbcGFyZW50Lm9wdHMubW9udGhzRmllbGRdW2QubW9udGhdO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAneWVhcic6XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRlY2FkZSA9IHRoaXMubG9jYWxEZWNhZGU7XHJcbiAgICAgICAgICAgICAgICAgICAgaHRtbCA9IGQueWVhcjtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZC55ZWFyIDwgZGVjYWRlWzBdIHx8IGQueWVhciA+IGRlY2FkZVsxXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzc2VzICs9ICcgLW90aGVyLWRlY2FkZS0nO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW9wdHMuc2VsZWN0T3RoZXJZZWFycykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NlcyArPSBcIiAtZGlzYWJsZWQtXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFvcHRzLnNob3dPdGhlclllYXJzKSBodG1sID0gJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAob3B0cy5vblJlbmRlckNlbGwpIHtcclxuICAgICAgICAgICAgICAgIHJlbmRlciA9IG9wdHMub25SZW5kZXJDZWxsKGRhdGUsIHR5cGUpIHx8IHt9O1xyXG4gICAgICAgICAgICAgICAgaHRtbCA9IHJlbmRlci5odG1sID8gcmVuZGVyLmh0bWwgOiBodG1sO1xyXG4gICAgICAgICAgICAgICAgY2xhc3NlcyArPSByZW5kZXIuY2xhc3NlcyA/ICcgJyArIHJlbmRlci5jbGFzc2VzIDogJyc7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChvcHRzLnJhbmdlKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZHAuaXNTYW1lKG1pblJhbmdlLCBkYXRlLCB0eXBlKSkgY2xhc3NlcyArPSAnIC1yYW5nZS1mcm9tLSc7XHJcbiAgICAgICAgICAgICAgICBpZiAoZHAuaXNTYW1lKG1heFJhbmdlLCBkYXRlLCB0eXBlKSkgY2xhc3NlcyArPSAnIC1yYW5nZS10by0nO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChwYXJlbnQuc2VsZWN0ZWREYXRlcy5sZW5ndGggPT0gMSAmJiBwYXJlbnQuZm9jdXNlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChcclxuICAgICAgICAgICAgICAgICAgICAgICAgKGRwLmJpZ2dlcihtaW5SYW5nZSwgZGF0ZSkgJiYgZHAubGVzcyhwYXJlbnQuZm9jdXNlZCwgZGF0ZSkpIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIChkcC5sZXNzKG1heFJhbmdlLCBkYXRlKSAmJiBkcC5iaWdnZXIocGFyZW50LmZvY3VzZWQsIGRhdGUpKSlcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzZXMgKz0gJyAtaW4tcmFuZ2UtJ1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRwLmxlc3MobWF4UmFuZ2UsIGRhdGUpICYmIGRwLmlzU2FtZShwYXJlbnQuZm9jdXNlZCwgZGF0ZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NlcyArPSAnIC1yYW5nZS1mcm9tLSdcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRwLmJpZ2dlcihtaW5SYW5nZSwgZGF0ZSkgJiYgZHAuaXNTYW1lKHBhcmVudC5mb2N1c2VkLCBkYXRlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzc2VzICs9ICcgLXJhbmdlLXRvLSdcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwYXJlbnQuc2VsZWN0ZWREYXRlcy5sZW5ndGggPT0gMikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkcC5iaWdnZXIobWluUmFuZ2UsIGRhdGUpICYmIGRwLmxlc3MobWF4UmFuZ2UsIGRhdGUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzZXMgKz0gJyAtaW4tcmFuZ2UtJ1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgIGlmIChkcC5pc1NhbWUoY3VycmVudERhdGUsIGRhdGUsIHR5cGUpKSBjbGFzc2VzICs9ICcgLWN1cnJlbnQtJztcclxuICAgICAgICAgICAgaWYgKHBhcmVudC5mb2N1c2VkICYmIGRwLmlzU2FtZShkYXRlLCBwYXJlbnQuZm9jdXNlZCwgdHlwZSkpIGNsYXNzZXMgKz0gJyAtZm9jdXMtJztcclxuICAgICAgICAgICAgaWYgKHBhcmVudC5faXNTZWxlY3RlZChkYXRlLCB0eXBlKSkgY2xhc3NlcyArPSAnIC1zZWxlY3RlZC0nO1xyXG4gICAgICAgICAgICBpZiAoIXBhcmVudC5faXNJblJhbmdlKGRhdGUsIHR5cGUpIHx8IHJlbmRlci5kaXNhYmxlZCkgY2xhc3NlcyArPSAnIC1kaXNhYmxlZC0nO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIGh0bWw6IGh0bWwsXHJcbiAgICAgICAgICAgICAgICBjbGFzc2VzOiBjbGFzc2VzXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDYWxjdWxhdGVzIGRheXMgbnVtYmVyIHRvIHJlbmRlci4gR2VuZXJhdGVzIGRheXMgaHRtbCBhbmQgcmV0dXJucyBpdC5cclxuICAgICAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0ZSAtIERhdGUgb2JqZWN0XHJcbiAgICAgICAgICogQHJldHVybnMge3N0cmluZ31cclxuICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIF9nZXREYXlzSHRtbDogZnVuY3Rpb24gKGRhdGUpIHtcclxuICAgICAgICAgICAgdmFyIHRvdGFsTW9udGhEYXlzID0gZHAuZ2V0RGF5c0NvdW50KGRhdGUpLFxyXG4gICAgICAgICAgICAgICAgZmlyc3RNb250aERheSA9IG5ldyBEYXRlKGRhdGUuZ2V0RnVsbFllYXIoKSwgZGF0ZS5nZXRNb250aCgpLCAxKS5nZXREYXkoKSxcclxuICAgICAgICAgICAgICAgIGxhc3RNb250aERheSA9IG5ldyBEYXRlKGRhdGUuZ2V0RnVsbFllYXIoKSwgZGF0ZS5nZXRNb250aCgpLCB0b3RhbE1vbnRoRGF5cykuZ2V0RGF5KCksXHJcbiAgICAgICAgICAgICAgICBkYXlzRnJvbVBldk1vbnRoID0gZmlyc3RNb250aERheSAtIHRoaXMuZC5sb2MuZmlyc3REYXksXHJcbiAgICAgICAgICAgICAgICBkYXlzRnJvbU5leHRNb250aCA9IDYgLSBsYXN0TW9udGhEYXkgKyB0aGlzLmQubG9jLmZpcnN0RGF5O1xyXG5cclxuICAgICAgICAgICAgZGF5c0Zyb21QZXZNb250aCA9IGRheXNGcm9tUGV2TW9udGggPCAwID8gZGF5c0Zyb21QZXZNb250aCArIDcgOiBkYXlzRnJvbVBldk1vbnRoO1xyXG4gICAgICAgICAgICBkYXlzRnJvbU5leHRNb250aCA9IGRheXNGcm9tTmV4dE1vbnRoID4gNiA/IGRheXNGcm9tTmV4dE1vbnRoIC0gNyA6IGRheXNGcm9tTmV4dE1vbnRoO1xyXG5cclxuICAgICAgICAgICAgdmFyIHN0YXJ0RGF5SW5kZXggPSAtZGF5c0Zyb21QZXZNb250aCArIDEsXHJcbiAgICAgICAgICAgICAgICBtLCB5LFxyXG4gICAgICAgICAgICAgICAgaHRtbCA9ICcnO1xyXG5cclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IHN0YXJ0RGF5SW5kZXgsIG1heCA9IHRvdGFsTW9udGhEYXlzICsgZGF5c0Zyb21OZXh0TW9udGg7IGkgPD0gbWF4OyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHkgPSBkYXRlLmdldEZ1bGxZZWFyKCk7XHJcbiAgICAgICAgICAgICAgICBtID0gZGF0ZS5nZXRNb250aCgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGh0bWwgKz0gdGhpcy5fZ2V0RGF5SHRtbChuZXcgRGF0ZSh5LCBtLCBpKSlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGh0bWw7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2dldERheUh0bWw6IGZ1bmN0aW9uIChkYXRlKSB7XHJcbiAgICAgICAgICAgdmFyIGNvbnRlbnQgPSB0aGlzLl9nZXRDZWxsQ29udGVudHMoZGF0ZSwgJ2RheScpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuICc8ZGl2IGNsYXNzPVwiJyArIGNvbnRlbnQuY2xhc3NlcyArICdcIiAnICtcclxuICAgICAgICAgICAgICAgICdkYXRhLWRhdGU9XCInICsgZGF0ZS5nZXREYXRlKCkgKyAnXCIgJyArXHJcbiAgICAgICAgICAgICAgICAnZGF0YS1tb250aD1cIicgKyBkYXRlLmdldE1vbnRoKCkgKyAnXCIgJyArXHJcbiAgICAgICAgICAgICAgICAnZGF0YS15ZWFyPVwiJyArIGRhdGUuZ2V0RnVsbFllYXIoKSArICdcIj4nICsgY29udGVudC5odG1sICsgJzwvZGl2Pic7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogR2VuZXJhdGVzIG1vbnRocyBodG1sXHJcbiAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGUgLSBwYXJzZWQgbG9jYWwgdmlldyBkYXRlXHJcbiAgICAgICAgICogQHJldHVybnMge3N0cmluZ31cclxuICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIF9nZXRNb250aHNIdG1sOiBmdW5jdGlvbiAoZGF0ZSkge1xyXG4gICAgICAgICAgICB2YXIgaHRtbCA9ICcnLFxyXG4gICAgICAgICAgICAgICAgaSA9IDA7XHJcblxyXG4gICAgICAgICAgICB3aGlsZShpIDwgMTIpIHtcclxuICAgICAgICAgICAgICAgIGh0bWwgKz0gdGhpcy5fZ2V0TW9udGhIdG1sKG5ldyBEYXRlKGRhdGUueWVhciwgaSkpO1xyXG4gICAgICAgICAgICAgICAgaSsrXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBodG1sO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9nZXRNb250aEh0bWw6IGZ1bmN0aW9uIChkYXRlKSB7XHJcbiAgICAgICAgICAgIHZhciBjb250ZW50ID0gdGhpcy5fZ2V0Q2VsbENvbnRlbnRzKGRhdGUsICdtb250aCcpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuICc8ZGl2IGNsYXNzPVwiJyArIGNvbnRlbnQuY2xhc3NlcyArICdcIiBkYXRhLW1vbnRoPVwiJyArIGRhdGUuZ2V0TW9udGgoKSArICdcIj4nICsgY29udGVudC5odG1sICsgJzwvZGl2PidcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDYWxjdWxhdGVzIHllYXJzIHZpZXcgaHRtbFxyXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBsb2NhbERhdGUgLSBwYXJzZWQgbG9jYWwgdmlldyBkYXRlXHJcbiAgICAgICAgICogQHJldHVybnMge3N0cmluZ31cclxuICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIF9nZXRZZWFyc0h0bWw6IGZ1bmN0aW9uIChsb2NhbERhdGUpIHtcclxuICAgICAgICAgICAgdmFyIGRlY2FkZSA9IGRwLmdldERlY2FkZShuZXcgRGF0ZShsb2NhbERhdGUueWVhciwgbG9jYWxEYXRlLm1vbnRoLCAxKSksXHJcbiAgICAgICAgICAgICAgICBmaXJzdFllYXIgPSBkZWNhZGVbMF0gLSAxLFxyXG4gICAgICAgICAgICAgICAgaHRtbCA9ICcnLFxyXG4gICAgICAgICAgICAgICAgaSA9IGZpcnN0WWVhcjtcclxuXHJcbiAgICAgICAgICAgIGZvciAoaTsgaSA8PSBkZWNhZGVbMV0gKyAxOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGh0bWwgKz0gdGhpcy5fZ2V0WWVhckh0bWwobmV3IERhdGUoaSAsIDApKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGh0bWw7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2dldFllYXJIdG1sOiBmdW5jdGlvbiAoZGF0ZSkge1xyXG4gICAgICAgICAgICB2YXIgY29udGVudCA9IHRoaXMuX2dldENlbGxDb250ZW50cyhkYXRlLCAneWVhcicpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuICc8ZGl2IGNsYXNzPVwiJyArIGNvbnRlbnQuY2xhc3NlcyArICdcIiBkYXRhLXllYXI9XCInICsgZGF0ZS5nZXRGdWxsWWVhcigpICsgJ1wiPicgKyBjb250ZW50Lmh0bWwgKyAnPC9kaXY+J1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9yZW5kZXJUeXBlczoge1xyXG4gICAgICAgICAgICBkYXlzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcGFyc2VkID0gZHAuZ2V0UGFyc2VkRGF0ZSh0aGlzLmQuY3VycmVudERhdGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIGRheU5hbWVzID0gdGhpcy5fZ2V0RGF5TmFtZXNIdG1sKHRoaXMuZC5sb2MuZmlyc3REYXkpLFxyXG4gICAgICAgICAgICAgICAgICAgIGRheXMgPSB0aGlzLl9nZXREYXlzSHRtbChuZXcgRGF0ZShwYXJzZWQueWVhciwgcGFyc2VkLm1vbnRoICsgdGhpcy5pbmRleCwgMSkpO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuJGNlbGxzLmh0bWwoZGF5cyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRuYW1lcy5odG1sKGRheU5hbWVzKVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBtb250aHM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBodG1sID0gdGhpcy5fZ2V0TW9udGhzSHRtbCh0aGlzLmxvY2FsVmlld0RhdGUpO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuJGNlbGxzLmh0bWwoaHRtbClcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgeWVhcnM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBodG1sID0gdGhpcy5fZ2V0WWVhcnNIdG1sKHRoaXMubG9jYWxWaWV3RGF0ZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy4kY2VsbHMuaHRtbChodG1sKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX3JlbmRlcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRzLm9ubHlUaW1lcGlja2VyKSByZXR1cm47XHJcbiAgICAgICAgICAgIHRoaXMuX3JlbmRlclR5cGVzW3RoaXMudHlwZV0uYmluZCh0aGlzKSgpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF91cGRhdGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyICRjZWxscyA9ICQoJy5kYXRlcGlja2VyLS1jZWxsJywgdGhpcy4kY2VsbHMpLFxyXG4gICAgICAgICAgICAgICAgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgICAgICAgICAgY2xhc3NlcyxcclxuICAgICAgICAgICAgICAgICRjZWxsLFxyXG4gICAgICAgICAgICAgICAgZGF0ZTtcclxuICAgICAgICAgICAgJGNlbGxzLmVhY2goZnVuY3Rpb24gKGNlbGwsIGkpIHtcclxuICAgICAgICAgICAgICAgICRjZWxsID0gJCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIGRhdGUgPSBfdGhpcy5kLl9nZXREYXRlRnJvbUNlbGwoJCh0aGlzKSk7XHJcbiAgICAgICAgICAgICAgICBjbGFzc2VzID0gX3RoaXMuX2dldENlbGxDb250ZW50cyhkYXRlLCBfdGhpcy5kLmNlbGxUeXBlKTtcclxuICAgICAgICAgICAgICAgICRjZWxsLmF0dHIoJ2NsYXNzJyxjbGFzc2VzLmNsYXNzZXMpXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHNob3c6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMub3B0cy5vbmx5VGltZXBpY2tlcikgcmV0dXJuO1xyXG4gICAgICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcygnYWN0aXZlJyk7XHJcbiAgICAgICAgICAgIHRoaXMuYWNpdHZlID0gdHJ1ZTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBoaWRlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGVsLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcclxuICAgICAgICAgICAgdGhpcy5hY3RpdmUgPSBmYWxzZTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBnZXQgbG9jYWxWaWV3RGF0ZSgpe1xyXG4gICAgICAgICAgICB2YXIgdmlld0RhdGUgPSB0aGlzLmQucGFyc2VkRGF0ZSxcclxuICAgICAgICAgICAgICAgIGluZGV4ID0gdGhpcy5pbmRleCxcclxuICAgICAgICAgICAgICAgIGRhdGU7XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMudHlwZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAgJ2RheXMnOlxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGUgPSBkcC5nZXRQYXJzZWREYXRlKG5ldyBEYXRlKHZpZXdEYXRlLnllYXIsIHZpZXdEYXRlLm1vbnRoICsgaW5kZXgsIHZpZXdEYXRlLmRhdGUpKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ21vbnRocyc6XHJcbiAgICAgICAgICAgICAgICAgICAgZGF0ZSA9IGRwLmdldFBhcnNlZERhdGUobmV3IERhdGUodmlld0RhdGUueWVhciArIGluZGV4LCAwLCAxKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICd5ZWFycyc6XHJcbiAgICAgICAgICAgICAgICAgICAgZGF0ZSA9IGRwLmdldFBhcnNlZERhdGUobmV3IERhdGUodmlld0RhdGUueWVhciArIDEwICogaW5kZXgsIHZpZXdEYXRlLm1vbnRoICsgaW5kZXgsIHZpZXdEYXRlLmRhdGUpKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZGF0ZVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGdldCBsb2NhbERlY2FkZSgpe1xyXG4gICAgICAgICAgICByZXR1cm4gZHAuZ2V0RGVjYWRlKG5ldyBEYXRlKHRoaXMubG9jYWxWaWV3RGF0ZS55ZWFyLCAwKSlcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvLyAgRXZlbnRzXHJcbiAgICAgICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgICAgICBfaGFuZGxlQ2xpY2s6IGZ1bmN0aW9uIChlbCkge1xyXG4gICAgICAgICAgICB2YXIgZGF0ZSA9IGVsLmRhdGEoJ2RhdGUnKSB8fCAxLFxyXG4gICAgICAgICAgICAgICAgbW9udGggPSBlbC5kYXRhKCdtb250aCcpIHx8IDAsXHJcbiAgICAgICAgICAgICAgICB5ZWFyID0gZWwuZGF0YSgneWVhcicpIHx8IHRoaXMuZC5wYXJzZWREYXRlLnllYXIsXHJcbiAgICAgICAgICAgICAgICBkcCA9IHRoaXMuZDtcclxuICAgICAgICAgICAgLy8gQ2hhbmdlIHZpZXcgaWYgbWluIHZpZXcgZG9lcyBub3QgcmVhY2ggeWV0XHJcbiAgICAgICAgICAgIGlmIChkcC52aWV3ICE9IHRoaXMub3B0cy5taW5WaWV3KSB7XHJcbiAgICAgICAgICAgICAgICBkcC5kb3duKG5ldyBEYXRlKHllYXIsIG1vbnRoLCBkYXRlKSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gU2VsZWN0IGRhdGUgaWYgbWluIHZpZXcgaXMgcmVhY2hlZFxyXG4gICAgICAgICAgICB2YXIgc2VsZWN0ZWREYXRlID0gbmV3IERhdGUoeWVhciwgbW9udGgsIGRhdGUpLFxyXG4gICAgICAgICAgICAgICAgYWxyZWFkeVNlbGVjdGVkID0gdGhpcy5kLl9pc1NlbGVjdGVkKHNlbGVjdGVkRGF0ZSwgdGhpcy5kLmNlbGxUeXBlKTtcclxuXHJcbiAgICAgICAgICAgIGlmICghYWxyZWFkeVNlbGVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICBkcC5fdHJpZ2dlcignY2xpY2tDZWxsJywgc2VsZWN0ZWREYXRlKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZHAuX2hhbmRsZUFscmVhZHlTZWxlY3RlZERhdGVzLmJpbmQoZHAsIGFscmVhZHlTZWxlY3RlZCwgc2VsZWN0ZWREYXRlKSgpO1xyXG5cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfb25DbGlja0NlbGw6IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgIHZhciAkZWwgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCcuZGF0ZXBpY2tlci0tY2VsbCcpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCRlbC5oYXNDbGFzcygnLWRpc2FibGVkLScpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICB0aGlzLl9oYW5kbGVDbGljay5iaW5kKHRoaXMpKCRlbCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufSkoKTtcclxuIiwiOyhmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdGVtcGxhdGUgPSAnJyArXHJcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJkYXRlcGlja2VyLS1uYXYtYWN0aW9uXCIgZGF0YS1hY3Rpb249XCJwcmV2XCI+I3twcmV2SHRtbH08L2Rpdj4nICtcclxuICAgICAgICAnPGRpdiBjbGFzcz1cImRhdGVwaWNrZXItLW5hdi10aXRsZVwiPiN7dGl0bGV9PC9kaXY+JyArXHJcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJkYXRlcGlja2VyLS1uYXYtYWN0aW9uXCIgZGF0YS1hY3Rpb249XCJuZXh0XCI+I3tuZXh0SHRtbH08L2Rpdj4nLFxyXG4gICAgICAgIGJ1dHRvbnNDb250YWluZXJUZW1wbGF0ZSA9ICc8ZGl2IGNsYXNzPVwiZGF0ZXBpY2tlci0tYnV0dG9uc1wiPjwvZGl2PicsXHJcbiAgICAgICAgYnV0dG9uID0gJzxzcGFuIGNsYXNzPVwiZGF0ZXBpY2tlci0tYnV0dG9uXCIgZGF0YS1hY3Rpb249XCIje2FjdGlvbn1cIj4je2xhYmVsfTwvc3Bhbj4nLFxyXG4gICAgICAgIGRhdGVwaWNrZXIgPSAkLmZuLmRhdGVwaWNrZXIsXHJcbiAgICAgICAgZHAgPSBkYXRlcGlja2VyLkNvbnN0cnVjdG9yO1xyXG5cclxuICAgIGRhdGVwaWNrZXIuTmF2aWdhdGlvbiA9IGZ1bmN0aW9uIChkLCBvcHRzKSB7XHJcbiAgICAgICAgdGhpcy5kID0gZDtcclxuICAgICAgICB0aGlzLm9wdHMgPSBvcHRzO1xyXG5cclxuICAgICAgICB0aGlzLiRidXR0b25zQ29udGFpbmVyID0gJyc7XHJcblxyXG4gICAgICAgIHRoaXMuaW5pdCgpO1xyXG4gICAgfTtcclxuXHJcbiAgICBkYXRlcGlja2VyLk5hdmlnYXRpb24ucHJvdG90eXBlID0ge1xyXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGhpcy5fYnVpbGRCYXNlSHRtbCgpO1xyXG4gICAgICAgICAgICB0aGlzLl9iaW5kRXZlbnRzKCk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2JpbmRFdmVudHM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGhpcy5kLiRuYXYub24oJ2NsaWNrJywgJy5kYXRlcGlja2VyLS1uYXYtYWN0aW9uJywgJC5wcm94eSh0aGlzLl9vbkNsaWNrTmF2QnV0dG9uLCB0aGlzKSk7XHJcbiAgICAgICAgICAgIHRoaXMuZC4kbmF2Lm9uKCdjbGljaycsICcuZGF0ZXBpY2tlci0tbmF2LXRpdGxlJywgJC5wcm94eSh0aGlzLl9vbkNsaWNrTmF2VGl0bGUsIHRoaXMpKTtcclxuICAgICAgICAgICAgdGhpcy5kLiRkYXRlcGlja2VyLm9uKCdjbGljaycsICcuZGF0ZXBpY2tlci0tYnV0dG9uJywgJC5wcm94eSh0aGlzLl9vbkNsaWNrTmF2QnV0dG9uLCB0aGlzKSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2J1aWxkQmFzZUh0bWw6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLm9wdHMub25seVRpbWVwaWNrZXIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlcigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuX2FkZEJ1dHRvbnNJZk5lZWQoKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfYWRkQnV0dG9uc0lmTmVlZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRzLnRvZGF5QnV0dG9uKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9hZGRCdXR0b24oJ3RvZGF5JylcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRzLmNsZWFyQnV0dG9uKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9hZGRCdXR0b24oJ2NsZWFyJylcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9yZW5kZXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIHRpdGxlID0gdGhpcy5fZ2V0VGl0bGUodGhpcy5kLmN1cnJlbnREYXRlKSxcclxuICAgICAgICAgICAgICAgIGh0bWwgPSBkcC50ZW1wbGF0ZSh0ZW1wbGF0ZSwgJC5leHRlbmQoe3RpdGxlOiB0aXRsZX0sIHRoaXMub3B0cykpO1xyXG4gICAgICAgICAgICB0aGlzLmQuJG5hdi5odG1sKGh0bWwpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5kLnZpZXcgPT0gJ3llYXJzJykge1xyXG4gICAgICAgICAgICAgICAgJCgnLmRhdGVwaWNrZXItLW5hdi10aXRsZScsIHRoaXMuZC4kbmF2KS5hZGRDbGFzcygnLWRpc2FibGVkLScpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuc2V0TmF2U3RhdHVzKCk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2dldFRpdGxlOiBmdW5jdGlvbiAoZGF0ZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kLmZvcm1hdERhdGUodGhpcy5vcHRzLm5hdlRpdGxlc1t0aGlzLmQudmlld10sIGRhdGUpXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2FkZEJ1dHRvbjogZnVuY3Rpb24gKHR5cGUpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLiRidXR0b25zQ29udGFpbmVyLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fYWRkQnV0dG9uc0NvbnRhaW5lcigpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgZGF0YSA9IHtcclxuICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6IHRoaXMuZC5sb2NbdHlwZV1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBodG1sID0gZHAudGVtcGxhdGUoYnV0dG9uLCBkYXRhKTtcclxuXHJcbiAgICAgICAgICAgIGlmICgkKCdbZGF0YS1hY3Rpb249JyArIHR5cGUgKyAnXScsIHRoaXMuJGJ1dHRvbnNDb250YWluZXIpLmxlbmd0aCkgcmV0dXJuO1xyXG4gICAgICAgICAgICB0aGlzLiRidXR0b25zQ29udGFpbmVyLmFwcGVuZChodG1sKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfYWRkQnV0dG9uc0NvbnRhaW5lcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0aGlzLmQuJGRhdGVwaWNrZXIuYXBwZW5kKGJ1dHRvbnNDb250YWluZXJUZW1wbGF0ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuJGJ1dHRvbnNDb250YWluZXIgPSAkKCcuZGF0ZXBpY2tlci0tYnV0dG9ucycsIHRoaXMuZC4kZGF0ZXBpY2tlcik7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgc2V0TmF2U3RhdHVzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmICghKHRoaXMub3B0cy5taW5EYXRlIHx8IHRoaXMub3B0cy5tYXhEYXRlKSB8fCAhdGhpcy5vcHRzLmRpc2FibGVOYXZXaGVuT3V0T2ZSYW5nZSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgdmFyIGRhdGUgPSB0aGlzLmQucGFyc2VkRGF0ZSxcclxuICAgICAgICAgICAgICAgIG0gPSBkYXRlLm1vbnRoLFxyXG4gICAgICAgICAgICAgICAgeSA9IGRhdGUueWVhcixcclxuICAgICAgICAgICAgICAgIGQgPSBkYXRlLmRhdGU7XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuZC52aWV3KSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdkYXlzJzpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZC5faXNJblJhbmdlKG5ldyBEYXRlKHksIG0tMSwgMSksICdtb250aCcpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2Rpc2FibGVOYXYoJ3ByZXYnKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZC5faXNJblJhbmdlKG5ldyBEYXRlKHksIG0rMSwgMSksICdtb250aCcpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2Rpc2FibGVOYXYoJ25leHQnKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ21vbnRocyc6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmQuX2lzSW5SYW5nZShuZXcgRGF0ZSh5LTEsIG0sIGQpLCAneWVhcicpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2Rpc2FibGVOYXYoJ3ByZXYnKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZC5faXNJblJhbmdlKG5ldyBEYXRlKHkrMSwgbSwgZCksICd5ZWFyJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fZGlzYWJsZU5hdignbmV4dCcpXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAneWVhcnMnOlxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBkZWNhZGUgPSBkcC5nZXREZWNhZGUodGhpcy5kLmRhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5kLl9pc0luUmFuZ2UobmV3IERhdGUoZGVjYWRlWzBdIC0gMSwgMCwgMSksICd5ZWFyJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fZGlzYWJsZU5hdigncHJldicpXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5kLl9pc0luUmFuZ2UobmV3IERhdGUoZGVjYWRlWzFdICsgMSwgMCwgMSksICd5ZWFyJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fZGlzYWJsZU5hdignbmV4dCcpXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX2Rpc2FibGVOYXY6IGZ1bmN0aW9uIChuYXYpIHtcclxuICAgICAgICAgICAgJCgnW2RhdGEtYWN0aW9uPVwiJyArIG5hdiArICdcIl0nLCB0aGlzLmQuJG5hdikuYWRkQ2xhc3MoJy1kaXNhYmxlZC0nKVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9hY3RpdmF0ZU5hdjogZnVuY3Rpb24gKG5hdikge1xyXG4gICAgICAgICAgICAkKCdbZGF0YS1hY3Rpb249XCInICsgbmF2ICsgJ1wiXScsIHRoaXMuZC4kbmF2KS5yZW1vdmVDbGFzcygnLWRpc2FibGVkLScpXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX29uQ2xpY2tOYXZCdXR0b246IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgIHZhciAkZWwgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdbZGF0YS1hY3Rpb25dJyksXHJcbiAgICAgICAgICAgICAgICBhY3Rpb24gPSAkZWwuZGF0YSgnYWN0aW9uJyk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmRbYWN0aW9uXSgpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9vbkNsaWNrTmF2VGl0bGU6IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgIGlmICgkKGUudGFyZ2V0KS5oYXNDbGFzcygnLWRpc2FibGVkLScpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5kLnZpZXcgPT0gJ2RheXMnKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kLnZpZXcgPSAnbW9udGhzJ1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmQudmlldyA9ICd5ZWFycyc7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxufSkoKTtcclxuIiwiOyhmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdGVtcGxhdGUgPSAnPGRpdiBjbGFzcz1cImRhdGVwaWNrZXItLXRpbWVcIj4nICtcclxuICAgICAgICAnPGRpdiBjbGFzcz1cImRhdGVwaWNrZXItLXRpbWUtY3VycmVudFwiPicgK1xyXG4gICAgICAgICcgICA8c3BhbiBjbGFzcz1cImRhdGVwaWNrZXItLXRpbWUtY3VycmVudC1ob3Vyc1wiPiN7aG91clZpc2libGV9PC9zcGFuPicgK1xyXG4gICAgICAgICcgICA8c3BhbiBjbGFzcz1cImRhdGVwaWNrZXItLXRpbWUtY3VycmVudC1jb2xvblwiPjo8L3NwYW4+JyArXHJcbiAgICAgICAgJyAgIDxzcGFuIGNsYXNzPVwiZGF0ZXBpY2tlci0tdGltZS1jdXJyZW50LW1pbnV0ZXNcIj4je21pblZhbHVlfTwvc3Bhbj4nICtcclxuICAgICAgICAnPC9kaXY+JyArXHJcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJkYXRlcGlja2VyLS10aW1lLXNsaWRlcnNcIj4nICtcclxuICAgICAgICAnICAgPGRpdiBjbGFzcz1cImRhdGVwaWNrZXItLXRpbWUtcm93XCI+JyArXHJcbiAgICAgICAgJyAgICAgIDxpbnB1dCB0eXBlPVwicmFuZ2VcIiBuYW1lPVwiaG91cnNcIiB2YWx1ZT1cIiN7aG91clZhbHVlfVwiIG1pbj1cIiN7aG91ck1pbn1cIiBtYXg9XCIje2hvdXJNYXh9XCIgc3RlcD1cIiN7aG91clN0ZXB9XCIvPicgK1xyXG4gICAgICAgICcgICA8L2Rpdj4nICtcclxuICAgICAgICAnICAgPGRpdiBjbGFzcz1cImRhdGVwaWNrZXItLXRpbWUtcm93XCI+JyArXHJcbiAgICAgICAgJyAgICAgIDxpbnB1dCB0eXBlPVwicmFuZ2VcIiBuYW1lPVwibWludXRlc1wiIHZhbHVlPVwiI3ttaW5WYWx1ZX1cIiBtaW49XCIje21pbk1pbn1cIiBtYXg9XCIje21pbk1heH1cIiBzdGVwPVwiI3ttaW5TdGVwfVwiLz4nICtcclxuICAgICAgICAnICAgPC9kaXY+JyArXHJcbiAgICAgICAgJzwvZGl2PicgK1xyXG4gICAgICAgICc8L2Rpdj4nLFxyXG4gICAgICAgIGRhdGVwaWNrZXIgPSAkLmZuLmRhdGVwaWNrZXIsXHJcbiAgICAgICAgZHAgPSBkYXRlcGlja2VyLkNvbnN0cnVjdG9yO1xyXG5cclxuICAgIGRhdGVwaWNrZXIuVGltZXBpY2tlciA9IGZ1bmN0aW9uIChpbnN0LCBvcHRzKSB7XHJcbiAgICAgICAgdGhpcy5kID0gaW5zdDtcclxuICAgICAgICB0aGlzLm9wdHMgPSBvcHRzO1xyXG5cclxuICAgICAgICB0aGlzLmluaXQoKTtcclxuICAgIH07XHJcblxyXG4gICAgZGF0ZXBpY2tlci5UaW1lcGlja2VyLnByb3RvdHlwZSA9IHtcclxuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHZhciBpbnB1dCA9ICdpbnB1dCc7XHJcbiAgICAgICAgICAgIHRoaXMuX3NldFRpbWUodGhpcy5kLmRhdGUpO1xyXG4gICAgICAgICAgICB0aGlzLl9idWlsZEhUTUwoKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC90cmlkZW50L2dpKSkge1xyXG4gICAgICAgICAgICAgICAgaW5wdXQgPSAnY2hhbmdlJztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5kLiRlbC5vbignc2VsZWN0RGF0ZScsIHRoaXMuX29uU2VsZWN0RGF0ZS5iaW5kKHRoaXMpKTtcclxuICAgICAgICAgICAgdGhpcy4kcmFuZ2VzLm9uKGlucHV0LCB0aGlzLl9vbkNoYW5nZVJhbmdlLmJpbmQodGhpcykpO1xyXG4gICAgICAgICAgICB0aGlzLiRyYW5nZXMub24oJ21vdXNldXAnLCB0aGlzLl9vbk1vdXNlVXBSYW5nZS5iaW5kKHRoaXMpKTtcclxuICAgICAgICAgICAgdGhpcy4kcmFuZ2VzLm9uKCdtb3VzZW1vdmUgZm9jdXMgJywgdGhpcy5fb25Nb3VzZUVudGVyUmFuZ2UuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgICAgIHRoaXMuJHJhbmdlcy5vbignbW91c2VvdXQgYmx1cicsIHRoaXMuX29uTW91c2VPdXRSYW5nZS5iaW5kKHRoaXMpKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfc2V0VGltZTogZnVuY3Rpb24gKGRhdGUpIHtcclxuICAgICAgICAgICAgdmFyIF9kYXRlID0gZHAuZ2V0UGFyc2VkRGF0ZShkYXRlKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuX2hhbmRsZURhdGUoZGF0ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuaG91cnMgPSBfZGF0ZS5ob3VycyA8IHRoaXMubWluSG91cnMgPyB0aGlzLm1pbkhvdXJzIDogX2RhdGUuaG91cnM7XHJcbiAgICAgICAgICAgIHRoaXMubWludXRlcyA9IF9kYXRlLm1pbnV0ZXMgPCB0aGlzLm1pbk1pbnV0ZXMgPyB0aGlzLm1pbk1pbnV0ZXMgOiBfZGF0ZS5taW51dGVzO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFNldHMgbWluSG91cnMgYW5kIG1pbk1pbnV0ZXMgZnJvbSBkYXRlICh1c3VhbGx5IGl0J3MgYSBtaW5EYXRlKVxyXG4gICAgICAgICAqIEFsc28gY2hhbmdlcyBtaW5NaW51dGVzIGlmIGN1cnJlbnQgaG91cnMgYXJlIGJpZ2dlciB0aGVuIEBkYXRlIGhvdXJzXHJcbiAgICAgICAgICogQHBhcmFtIGRhdGUge0RhdGV9XHJcbiAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgKi9cclxuICAgICAgICBfc2V0TWluVGltZUZyb21EYXRlOiBmdW5jdGlvbiAoZGF0ZSkge1xyXG4gICAgICAgICAgICB0aGlzLm1pbkhvdXJzID0gZGF0ZS5nZXRIb3VycygpO1xyXG4gICAgICAgICAgICB0aGlzLm1pbk1pbnV0ZXMgPSBkYXRlLmdldE1pbnV0ZXMoKTtcclxuXHJcbiAgICAgICAgICAgIC8vIElmLCBmb3IgZXhhbXBsZSwgbWluIGhvdXJzIGFyZSAxMCwgYW5kIGN1cnJlbnQgaG91cnMgYXJlIDEyLFxyXG4gICAgICAgICAgICAvLyB1cGRhdGUgbWluTWludXRlcyB0byBkZWZhdWx0IHZhbHVlLCB0byBiZSBhYmxlIHRvIGNob29zZSB3aG9sZSByYW5nZSBvZiB2YWx1ZXNcclxuICAgICAgICAgICAgaWYgKHRoaXMuZC5sYXN0U2VsZWN0ZWREYXRlKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kLmxhc3RTZWxlY3RlZERhdGUuZ2V0SG91cnMoKSA+IGRhdGUuZ2V0SG91cnMoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWluTWludXRlcyA9IHRoaXMub3B0cy5taW5NaW51dGVzO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX3NldE1heFRpbWVGcm9tRGF0ZTogZnVuY3Rpb24gKGRhdGUpIHtcclxuICAgICAgICAgICAgdGhpcy5tYXhIb3VycyA9IGRhdGUuZ2V0SG91cnMoKTtcclxuICAgICAgICAgICAgdGhpcy5tYXhNaW51dGVzID0gZGF0ZS5nZXRNaW51dGVzKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5kLmxhc3RTZWxlY3RlZERhdGUpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmQubGFzdFNlbGVjdGVkRGF0ZS5nZXRIb3VycygpIDwgZGF0ZS5nZXRIb3VycygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tYXhNaW51dGVzID0gdGhpcy5vcHRzLm1heE1pbnV0ZXM7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfc2V0RGVmYXVsdE1pbk1heFRpbWU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIG1heEhvdXJzID0gMjMsXHJcbiAgICAgICAgICAgICAgICBtYXhNaW51dGVzID0gNTksXHJcbiAgICAgICAgICAgICAgICBvcHRzID0gdGhpcy5vcHRzO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5taW5Ib3VycyA9IG9wdHMubWluSG91cnMgPCAwIHx8IG9wdHMubWluSG91cnMgPiBtYXhIb3VycyA/IDAgOiBvcHRzLm1pbkhvdXJzO1xyXG4gICAgICAgICAgICB0aGlzLm1pbk1pbnV0ZXMgPSBvcHRzLm1pbk1pbnV0ZXMgPCAwIHx8IG9wdHMubWluTWludXRlcyA+IG1heE1pbnV0ZXMgPyAwIDogb3B0cy5taW5NaW51dGVzO1xyXG4gICAgICAgICAgICB0aGlzLm1heEhvdXJzID0gb3B0cy5tYXhIb3VycyA8IDAgfHwgb3B0cy5tYXhIb3VycyA+IG1heEhvdXJzID8gbWF4SG91cnMgOiBvcHRzLm1heEhvdXJzO1xyXG4gICAgICAgICAgICB0aGlzLm1heE1pbnV0ZXMgPSBvcHRzLm1heE1pbnV0ZXMgPCAwIHx8IG9wdHMubWF4TWludXRlcyA+IG1heE1pbnV0ZXMgPyBtYXhNaW51dGVzIDogb3B0cy5tYXhNaW51dGVzO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIExvb2tzIGZvciBtaW4vbWF4IGhvdXJzL21pbnV0ZXMgYW5kIGlmIGN1cnJlbnQgdmFsdWVzXHJcbiAgICAgICAgICogYXJlIG91dCBvZiByYW5nZSBzZXRzIHZhbGlkIHZhbHVlcy5cclxuICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIF92YWxpZGF0ZUhvdXJzTWludXRlczogZnVuY3Rpb24gKGRhdGUpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaG91cnMgPCB0aGlzLm1pbkhvdXJzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhvdXJzID0gdGhpcy5taW5Ib3VycztcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmhvdXJzID4gdGhpcy5tYXhIb3Vycykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ob3VycyA9IHRoaXMubWF4SG91cnM7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm1pbnV0ZXMgPCB0aGlzLm1pbk1pbnV0ZXMpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWludXRlcyA9IHRoaXMubWluTWludXRlcztcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLm1pbnV0ZXMgPiB0aGlzLm1heE1pbnV0ZXMpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWludXRlcyA9IHRoaXMubWF4TWludXRlcztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9idWlsZEhUTUw6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIGx6ID0gZHAuZ2V0TGVhZGluZ1plcm9OdW0sXHJcbiAgICAgICAgICAgICAgICBkYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGhvdXJNaW46IHRoaXMubWluSG91cnMsXHJcbiAgICAgICAgICAgICAgICAgICAgaG91ck1heDogbHoodGhpcy5tYXhIb3VycyksXHJcbiAgICAgICAgICAgICAgICAgICAgaG91clN0ZXA6IHRoaXMub3B0cy5ob3Vyc1N0ZXAsXHJcbiAgICAgICAgICAgICAgICAgICAgaG91clZhbHVlOiB0aGlzLmhvdXJzLFxyXG4gICAgICAgICAgICAgICAgICAgIGhvdXJWaXNpYmxlOiBseih0aGlzLmRpc3BsYXlIb3VycyksXHJcbiAgICAgICAgICAgICAgICAgICAgbWluTWluOiB0aGlzLm1pbk1pbnV0ZXMsXHJcbiAgICAgICAgICAgICAgICAgICAgbWluTWF4OiBseih0aGlzLm1heE1pbnV0ZXMpLFxyXG4gICAgICAgICAgICAgICAgICAgIG1pblN0ZXA6IHRoaXMub3B0cy5taW51dGVzU3RlcCxcclxuICAgICAgICAgICAgICAgICAgICBtaW5WYWx1ZTogbHoodGhpcy5taW51dGVzKVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIF90ZW1wbGF0ZSA9IGRwLnRlbXBsYXRlKHRlbXBsYXRlLCBkYXRhKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuJHRpbWVwaWNrZXIgPSAkKF90ZW1wbGF0ZSkuYXBwZW5kVG8odGhpcy5kLiRkYXRlcGlja2VyKTtcclxuICAgICAgICAgICAgdGhpcy4kcmFuZ2VzID0gJCgnW3R5cGU9XCJyYW5nZVwiXScsIHRoaXMuJHRpbWVwaWNrZXIpO1xyXG4gICAgICAgICAgICB0aGlzLiRob3VycyA9ICQoJ1tuYW1lPVwiaG91cnNcIl0nLCB0aGlzLiR0aW1lcGlja2VyKTtcclxuICAgICAgICAgICAgdGhpcy4kbWludXRlcyA9ICQoJ1tuYW1lPVwibWludXRlc1wiXScsIHRoaXMuJHRpbWVwaWNrZXIpO1xyXG4gICAgICAgICAgICB0aGlzLiRob3Vyc1RleHQgPSAkKCcuZGF0ZXBpY2tlci0tdGltZS1jdXJyZW50LWhvdXJzJywgdGhpcy4kdGltZXBpY2tlcik7XHJcbiAgICAgICAgICAgIHRoaXMuJG1pbnV0ZXNUZXh0ID0gJCgnLmRhdGVwaWNrZXItLXRpbWUtY3VycmVudC1taW51dGVzJywgdGhpcy4kdGltZXBpY2tlcik7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5kLmFtcG0pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGFtcG0gPSAkKCc8c3BhbiBjbGFzcz1cImRhdGVwaWNrZXItLXRpbWUtY3VycmVudC1hbXBtXCI+JylcclxuICAgICAgICAgICAgICAgICAgICAuYXBwZW5kVG8oJCgnLmRhdGVwaWNrZXItLXRpbWUtY3VycmVudCcsIHRoaXMuJHRpbWVwaWNrZXIpKVxyXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKHRoaXMuZGF5UGVyaW9kKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLiR0aW1lcGlja2VyLmFkZENsYXNzKCctYW0tcG0tJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfdXBkYXRlQ3VycmVudFRpbWU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIGggPSAgZHAuZ2V0TGVhZGluZ1plcm9OdW0odGhpcy5kaXNwbGF5SG91cnMpLFxyXG4gICAgICAgICAgICAgICAgbSA9IGRwLmdldExlYWRpbmdaZXJvTnVtKHRoaXMubWludXRlcyk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLiRob3Vyc1RleHQuaHRtbChoKTtcclxuICAgICAgICAgICAgdGhpcy4kbWludXRlc1RleHQuaHRtbChtKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmQuYW1wbSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kYW1wbS5odG1sKHRoaXMuZGF5UGVyaW9kKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF91cGRhdGVSYW5nZXM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGhpcy4kaG91cnMuYXR0cih7XHJcbiAgICAgICAgICAgICAgICBtaW46IHRoaXMubWluSG91cnMsXHJcbiAgICAgICAgICAgICAgICBtYXg6IHRoaXMubWF4SG91cnNcclxuICAgICAgICAgICAgfSkudmFsKHRoaXMuaG91cnMpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy4kbWludXRlcy5hdHRyKHtcclxuICAgICAgICAgICAgICAgIG1pbjogdGhpcy5taW5NaW51dGVzLFxyXG4gICAgICAgICAgICAgICAgbWF4OiB0aGlzLm1heE1pbnV0ZXNcclxuICAgICAgICAgICAgfSkudmFsKHRoaXMubWludXRlcylcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBTZXRzIG1pbkhvdXJzLCBtaW5NaW51dGVzIGV0Yy4gZnJvbSBkYXRlLiBJZiBkYXRlIGlzIG5vdCBwYXNzZWQsIHRoYW4gc2V0c1xyXG4gICAgICAgICAqIHZhbHVlcyBmcm9tIG9wdGlvbnNcclxuICAgICAgICAgKiBAcGFyYW0gW2RhdGVdIHtvYmplY3R9IC0gRGF0ZSBvYmplY3QsIHRvIGdldCB2YWx1ZXMgZnJvbVxyXG4gICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgX2hhbmRsZURhdGU6IGZ1bmN0aW9uIChkYXRlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX3NldERlZmF1bHRNaW5NYXhUaW1lKCk7XHJcbiAgICAgICAgICAgIGlmIChkYXRlKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZHAuaXNTYW1lKGRhdGUsIHRoaXMuZC5vcHRzLm1pbkRhdGUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2V0TWluVGltZUZyb21EYXRlKHRoaXMuZC5vcHRzLm1pbkRhdGUpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChkcC5pc1NhbWUoZGF0ZSwgdGhpcy5kLm9wdHMubWF4RGF0ZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9zZXRNYXhUaW1lRnJvbURhdGUodGhpcy5kLm9wdHMubWF4RGF0ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuX3ZhbGlkYXRlSG91cnNNaW51dGVzKGRhdGUpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHVwZGF0ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0aGlzLl91cGRhdGVSYW5nZXMoKTtcclxuICAgICAgICAgICAgdGhpcy5fdXBkYXRlQ3VycmVudFRpbWUoKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDYWxjdWxhdGVzIHZhbGlkIGhvdXIgdmFsdWUgdG8gZGlzcGxheSBpbiB0ZXh0IGlucHV0IGFuZCBkYXRlcGlja2VyJ3MgYm9keS5cclxuICAgICAgICAgKiBAcGFyYW0gZGF0ZSB7RGF0ZXxOdW1iZXJ9IC0gZGF0ZSBvciBob3Vyc1xyXG4gICAgICAgICAqIEBwYXJhbSBbYW1wbV0ge0Jvb2xlYW59IC0gMTIgaG91cnMgbW9kZVxyXG4gICAgICAgICAqIEByZXR1cm5zIHt7aG91cnM6ICosIGRheVBlcmlvZDogc3RyaW5nfX1cclxuICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIF9nZXRWYWxpZEhvdXJzRnJvbURhdGU6IGZ1bmN0aW9uIChkYXRlLCBhbXBtKSB7XHJcbiAgICAgICAgICAgIHZhciBkID0gZGF0ZSxcclxuICAgICAgICAgICAgICAgIGhvdXJzID0gZGF0ZTtcclxuXHJcbiAgICAgICAgICAgIGlmIChkYXRlIGluc3RhbmNlb2YgRGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgZCA9IGRwLmdldFBhcnNlZERhdGUoZGF0ZSk7XHJcbiAgICAgICAgICAgICAgICBob3VycyA9IGQuaG91cnM7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBfYW1wbSA9IGFtcG0gfHwgdGhpcy5kLmFtcG0sXHJcbiAgICAgICAgICAgICAgICBkYXlQZXJpb2QgPSAnYW0nO1xyXG5cclxuICAgICAgICAgICAgaWYgKF9hbXBtKSB7XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2godHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgaG91cnMgPT0gMDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgaG91cnMgPSAxMjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBob3VycyA9PSAxMjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF5UGVyaW9kID0gJ3BtJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBob3VycyA+IDExOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBob3VycyA9IGhvdXJzIC0gMTI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRheVBlcmlvZCA9ICdwbSc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgaG91cnM6IGhvdXJzLFxyXG4gICAgICAgICAgICAgICAgZGF5UGVyaW9kOiBkYXlQZXJpb2RcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHNldCBob3VycyAodmFsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2hvdXJzID0gdmFsO1xyXG5cclxuICAgICAgICAgICAgdmFyIGRpc3BsYXlIb3VycyA9IHRoaXMuX2dldFZhbGlkSG91cnNGcm9tRGF0ZSh2YWwpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5kaXNwbGF5SG91cnMgPSBkaXNwbGF5SG91cnMuaG91cnM7XHJcbiAgICAgICAgICAgIHRoaXMuZGF5UGVyaW9kID0gZGlzcGxheUhvdXJzLmRheVBlcmlvZDtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBnZXQgaG91cnMoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9ob3VycztcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvLyAgRXZlbnRzXHJcbiAgICAgICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgICAgICBfb25DaGFuZ2VSYW5nZTogZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgdmFyICR0YXJnZXQgPSAkKGUudGFyZ2V0KSxcclxuICAgICAgICAgICAgICAgIG5hbWUgPSAkdGFyZ2V0LmF0dHIoJ25hbWUnKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHRoaXMuZC50aW1lcGlja2VySXNBY3RpdmUgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgdGhpc1tuYW1lXSA9ICR0YXJnZXQudmFsKCk7XHJcbiAgICAgICAgICAgIHRoaXMuX3VwZGF0ZUN1cnJlbnRUaW1lKCk7XHJcbiAgICAgICAgICAgIHRoaXMuZC5fdHJpZ2dlcigndGltZUNoYW5nZScsIFt0aGlzLmhvdXJzLCB0aGlzLm1pbnV0ZXNdKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuX2hhbmRsZURhdGUodGhpcy5kLmxhc3RTZWxlY3RlZERhdGUpO1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZSgpXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgX29uU2VsZWN0RGF0ZTogZnVuY3Rpb24gKGUsIGRhdGEpIHtcclxuICAgICAgICAgICAgdGhpcy5faGFuZGxlRGF0ZShkYXRhKTtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGUoKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfb25Nb3VzZUVudGVyUmFuZ2U6IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgIHZhciBuYW1lID0gJChlLnRhcmdldCkuYXR0cignbmFtZScpO1xyXG4gICAgICAgICAgICAkKCcuZGF0ZXBpY2tlci0tdGltZS1jdXJyZW50LScgKyBuYW1lLCB0aGlzLiR0aW1lcGlja2VyKS5hZGRDbGFzcygnLWZvY3VzLScpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIF9vbk1vdXNlT3V0UmFuZ2U6IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgIHZhciBuYW1lID0gJChlLnRhcmdldCkuYXR0cignbmFtZScpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5kLmluRm9jdXMpIHJldHVybjsgLy8gUHJldmVudCByZW1vdmluZyBmb2N1cyB3aGVuIG1vdXNlIG91dCBvZiByYW5nZSBzbGlkZXJcclxuICAgICAgICAgICAgJCgnLmRhdGVwaWNrZXItLXRpbWUtY3VycmVudC0nICsgbmFtZSwgdGhpcy4kdGltZXBpY2tlcikucmVtb3ZlQ2xhc3MoJy1mb2N1cy0nKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBfb25Nb3VzZVVwUmFuZ2U6IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZC50aW1lcGlja2VySXNBY3RpdmUgPSBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59KSgpO1xyXG4iXX0=
