
const SteedosFilter = require("./filter");
const _ = require('underscore');
const utils = require("./utils");

let formatFiltersToDev = (filters) => {
    var filtersLooper, selector;
    if (!filters.length) {
        return;
    }
    selector = [];
    filtersLooper = function (filters_loop) {
        var builtinValue, field, i, isBetweenOperation, option, ref, sub_selector, tempFilters, tempLooperResult, value;
        tempFilters = [];
        tempLooperResult = null;
        if (filters_loop === "!"){
            return filters_loop;
        }
        if (_.isFunction(filters_loop)) {
            filters_loop = filters_loop();
        }
        if (!_.isArray(filters_loop)) {
            if (_.isObject(filters_loop)) {
				// 当filters不是[Array]类型而是[Object]类型时，进行格式转换
                if (filters_loop.operation) {
                    filters_loop = [filters_loop.field, filters_loop.operation, filters_loop.value];
                } else {
                    return null;
                }
            } else {
                return null;
            }
        }
        if (filters_loop.length === 1) {
            // 只有一个元素，进一步解析其内容
            tempLooperResult = filtersLooper(filters_loop[0]);
            if (tempLooperResult) {
                tempFilters.push(tempLooperResult);
            }
        } else if (filters_loop.length === 2) {
            // 只有两个元素，进一步解析其内容，省略"and"连接符，但是有"and"效果
            filters_loop.forEach(function (n, i) {
                tempLooperResult = filtersLooper(n);
                if (tempLooperResult) {
                    return tempFilters.push(tempLooperResult);
                }
            });
        } else if (filters_loop.length === 3) {
            // 只有三个元素，可能中间是"or","and"连接符也可能是普通数组，区别对待解析
            if (_.include(["or", "and"], filters_loop[1])) {
                // 中间有"or","and"连接符，则循环filters_loop，依次用filtersLooper解析其过虑条件
				// 最后生成的结果格式：tempFilters = [filtersLooper(filters_loop[0]), filters_loop[1], filtersLooper(filters_loop[2]), ...]
				// 因要判断filtersLooper(filters_loop[0])及filtersLooper(filters_loop[2])是否为空
				// 所以不能直接写：tempFilters = [filtersLooper(filters_loop[0]), filters_loop[1], filtersLooper(filters_loop[2])]
                tempFilters = [];
                i = 0;
                while (i < filters_loop.length) {
                    if (_.include(["or", "and"], filters_loop[i])) {
                        i++;
                        continue;
                    }
                    tempLooperResult = filtersLooper(filters_loop[i]);
                    if (!tempLooperResult) {
                        i++;
                        continue;
                    }
                    if (i > 0) {
                        tempFilters.push(filters_loop[i - 1]);
                    }
                    tempFilters.push(tempLooperResult);
                    i++;
                }
                if (_.include(["or", "and"], tempFilters[0])) {
                    tempFilters.shift();
                }
            } else {
                if (_.isString(filters_loop[1])) {
                    // 第二个元素为字符串，则认为是某一个具体的过虑条件
                    field = filters_loop[0];
                    option = filters_loop[1];
                    value = filters_loop[2];
                    if (_.isFunction(value)) {
                        value = value();
                    }
                    sub_selector = [];
                    isBetweenOperation = utils.isBetweenFilterOperation(option);
                    if (isBetweenOperation && _.isString(value)) {
                        // 如果是between运算符内置值，则取出对应values作为过滤值
                        // 比如value为last_year，返回对应的时间值
                        builtinValue = utils.getBetweenBuiltinValueItem(value);
                        if (builtinValue) {
                            value = builtinValue.values;
                        }
                    }
                    if (_.isArray(value)) {
                        // if (["date", "datetime"].includes(filter_field_type)) {
                        //     // date:因日期字段数据库保存的值中不带时间值的，所以日期类型过滤条件需要特意处理的，为了兼容dx控件显示
                        // 	// datetime:因新建/编辑记录保存的时候network中是处理了时区偏差的，所以在请求过滤条件的时候也应该相应的设置
                        //     _.forEach(value, function (fv) {
                        //         if (fv) {
                        //             return fv.setHours(fv.getHours() + fv.getTimezoneOffset() / 60); // 处理grid中的datetime 偏移
                        //         }
                        //     });
                        // }
                        if (option === "=") {
                            _.each(value, function (v) {
                                return sub_selector.push([field, option, v], "or");
                            });
                        } else if (option === "<>") {
                            _.each(value, function (v) {
                                return sub_selector.push([field, option, v], "and");
                            });
                        } else if (isBetweenOperation && (value.length = 2)) {
                            if (value[0] !== null || value[1] !== null) {
                                if (value[0] !== null) {
                                    sub_selector.push([field, ">=", value[0]], "and");
                                }
                                if (value[1] !== null) {
                                    sub_selector.push([field, "<=", value[1]], "and");
                                }
                            }
                        } else {
                            _.each(value, function (v) {
                                return sub_selector.push([field, option, v], "or");
                            });
                        }
                        if (sub_selector[sub_selector.length - 1] === "and" || sub_selector[sub_selector.length - 1] === "or") {
                            sub_selector.pop();
                        }
                        if (sub_selector.length) {
                            tempFilters = sub_selector;
                        }
                    } else {
                        // if (["date", "datetime"].includes(filter_field_type)) {
                        // 	// date:因日期字段数据库保存的值中不带时间值的，所以日期类型过滤条件需要特意处理的，为了兼容dx控件显示
                        // 	// datetime:因新建/编辑记录保存的时候network中是处理了时区偏差的，所以在请求过滤条件的时候也应该相应的设置
                        //     if (value) {
                        //         value.setHours(value.getHours() + value.getTimezoneOffset() / 60); // 处理grid中的datetime 偏移
                        //     }
                        // }
                        tempFilters = [field, option, value];
                    }
                } else {
                    // 普通数组，当成完整过虑条件进一步循环解析每个条件
                    filters_loop.forEach(function (n, i) {
                        tempLooperResult = filtersLooper(n);
                        if (tempLooperResult) {
                            return tempFilters.push(tempLooperResult);
                        }
                    });
                }
            }
        } else {
            // 超过3个元素的数组，可能中间是"or","and"连接符也可能是普通数组，区别对待解析
            if ((ref = _.intersection(["or", "and"], filters_loop)) != null ? ref.length : void 0) {
                // 中间有"or","and"连接符，则循环filters_loop，依次用filtersLooper解析其过虑条件
				// 最后生成的结果格式：tempFilters = [filtersLooper(filters_loop[0]), filters_loop[1], filtersLooper(filters_loop[2]), ...]
				// 因要判断filtersLooper(filters_loop[0])及filtersLooper(filters_loop[2])是否为空
				// 所以不能直接写：tempFilters = [filtersLooper(filters_loop[0]), filters_loop[1], filtersLooper(filters_loop[2])]
                tempFilters = [];
                i = 0;
                while (i < filters_loop.length) {
                    if (_.include(["or", "and"], filters_loop[i])) {
                        i++;
                        continue;
                    }
                    tempLooperResult = filtersLooper(filters_loop[i]);
                    if (!tempLooperResult) {
                        i++;
                        continue;
                    }
                    if (i > 0) {
                        tempFilters.push(filters_loop[i - 1]);
                    }
                    tempFilters.push(tempLooperResult);
                    i++;
                }
                if (_.include(["or", "and"], tempFilters[0])) {
                    tempFilters.shift();
                }
            } else {
                // 普通过虑条件，当成完整过虑条件进一步循环解析每个条件
                filters_loop.forEach(function (n, i) {
                    tempLooperResult = filtersLooper(n);
                    if (tempLooperResult) {
                        return tempFilters.push(tempLooperResult);
                    }
                });
            }
        }
        if (tempFilters.length) {
            return tempFilters;
        } else {
            return null;
        }
    };
    selector = filtersLooper(filters);
    return selector;
};

let formatFiltersToODataQuery = (filters, odataProtocolVersion, forceLowerCase) => {
    let devFilters = formatFiltersToDev(filters);
    return new SteedosFilter(devFilters, odataProtocolVersion, forceLowerCase).formatFiltersToODataQuery();
};

exports.formatFiltersToDev = formatFiltersToDev;
exports.formatFiltersToODataQuery = formatFiltersToODataQuery;
