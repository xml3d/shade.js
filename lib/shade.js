;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function () {
    var global = typeof window !== 'undefined' ? window : {};
    global.Shade = require("../index.js");
}());

},{"../index.js":2}],2:[function(require,module,exports){
module.exports = require('./src/shade.js');
},{"./src/shade.js":37}],3:[function(require,module,exports){
/*
  Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>
  Copyright (C) 2012 Mathias Bynens <mathias@qiwi.be>
  Copyright (C) 2012 Joost-Wim Boekesteijn <joost-wim@boekesteijn.nl>
  Copyright (C) 2012 Kris Kowal <kris.kowal@cixar.com>
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
  Copyright (C) 2012 Arpad Borsos <arpad.borsos@googlemail.com>
  Copyright (C) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true plusplus:true */
/*global esprima:true, define:true, exports:true, window: true,
throwError: true, createLiteral: true, generateStatement: true,
parseAssignmentExpression: true, parseBlock: true, parseExpression: true,
parseFunctionDeclaration: true, parseFunctionExpression: true,
parseFunctionSourceElements: true, parseVariableIdentifier: true,
parseLeftHandSideExpression: true,
parseStatement: true, parseSourceElement: true */

(function (root, factory) {
    'use strict';

    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
    // Rhino, and plain browser loading.
    if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
    } else if (typeof exports !== 'undefined') {
        factory(exports);
    } else {
        factory((root.esprima = {}));
    }
}(this, function (exports) {
    'use strict';

    var Token,
        TokenName,
        Syntax,
        PropertyKind,
        Messages,
        Regex,
        source,
        strict,
        index,
        lineNumber,
        lineStart,
        length,
        buffer,
        state,
        extra;

    Token = {
        BooleanLiteral: 1,
        EOF: 2,
        Identifier: 3,
        Keyword: 4,
        NullLiteral: 5,
        NumericLiteral: 6,
        Punctuator: 7,
        StringLiteral: 8
    };

    TokenName = {};
    TokenName[Token.BooleanLiteral] = 'Boolean';
    TokenName[Token.EOF] = '<end>';
    TokenName[Token.Identifier] = 'Identifier';
    TokenName[Token.Keyword] = 'Keyword';
    TokenName[Token.NullLiteral] = 'Null';
    TokenName[Token.NumericLiteral] = 'Numeric';
    TokenName[Token.Punctuator] = 'Punctuator';
    TokenName[Token.StringLiteral] = 'String';

    Syntax = {
        AssignmentExpression: 'AssignmentExpression',
        ArrayExpression: 'ArrayExpression',
        BlockStatement: 'BlockStatement',
        BinaryExpression: 'BinaryExpression',
        BreakStatement: 'BreakStatement',
        CallExpression: 'CallExpression',
        CatchClause: 'CatchClause',
        ConditionalExpression: 'ConditionalExpression',
        ContinueStatement: 'ContinueStatement',
        DoWhileStatement: 'DoWhileStatement',
        DebuggerStatement: 'DebuggerStatement',
        EmptyStatement: 'EmptyStatement',
        ExpressionStatement: 'ExpressionStatement',
        ForStatement: 'ForStatement',
        ForInStatement: 'ForInStatement',
        FunctionDeclaration: 'FunctionDeclaration',
        FunctionExpression: 'FunctionExpression',
        Identifier: 'Identifier',
        IfStatement: 'IfStatement',
        Literal: 'Literal',
        LabeledStatement: 'LabeledStatement',
        LogicalExpression: 'LogicalExpression',
        MemberExpression: 'MemberExpression',
        NewExpression: 'NewExpression',
        ObjectExpression: 'ObjectExpression',
        Program: 'Program',
        Property: 'Property',
        ReturnStatement: 'ReturnStatement',
        SequenceExpression: 'SequenceExpression',
        SwitchStatement: 'SwitchStatement',
        SwitchCase: 'SwitchCase',
        ThisExpression: 'ThisExpression',
        ThrowStatement: 'ThrowStatement',
        TryStatement: 'TryStatement',
        UnaryExpression: 'UnaryExpression',
        UpdateExpression: 'UpdateExpression',
        VariableDeclaration: 'VariableDeclaration',
        VariableDeclarator: 'VariableDeclarator',
        WhileStatement: 'WhileStatement',
        WithStatement: 'WithStatement'
    };

    PropertyKind = {
        Data: 1,
        Get: 2,
        Set: 4
    };

    // Error messages should be identical to V8.
    Messages = {
        UnexpectedToken:  'Unexpected token %0',
        UnexpectedNumber:  'Unexpected number',
        UnexpectedString:  'Unexpected string',
        UnexpectedIdentifier:  'Unexpected identifier',
        UnexpectedReserved:  'Unexpected reserved word',
        UnexpectedEOS:  'Unexpected end of input',
        NewlineAfterThrow:  'Illegal newline after throw',
        InvalidRegExp: 'Invalid regular expression',
        UnterminatedRegExp:  'Invalid regular expression: missing /',
        InvalidLHSInAssignment:  'Invalid left-hand side in assignment',
        InvalidLHSInForIn:  'Invalid left-hand side in for-in',
        MultipleDefaultsInSwitch: 'More than one default clause in switch statement',
        NoCatchOrFinally:  'Missing catch or finally after try',
        UnknownLabel: 'Undefined label \'%0\'',
        Redeclaration: '%0 \'%1\' has already been declared',
        IllegalContinue: 'Illegal continue statement',
        IllegalBreak: 'Illegal break statement',
        IllegalReturn: 'Illegal return statement',
        StrictModeWith:  'Strict mode code may not include a with statement',
        StrictCatchVariable:  'Catch variable may not be eval or arguments in strict mode',
        StrictVarName:  'Variable name may not be eval or arguments in strict mode',
        StrictParamName:  'Parameter name eval or arguments is not allowed in strict mode',
        StrictParamDupe: 'Strict mode function may not have duplicate parameter names',
        StrictFunctionName:  'Function name may not be eval or arguments in strict mode',
        StrictOctalLiteral:  'Octal literals are not allowed in strict mode.',
        StrictDelete:  'Delete of an unqualified identifier in strict mode.',
        StrictDuplicateProperty:  'Duplicate data property in object literal not allowed in strict mode',
        AccessorDataProperty:  'Object literal may not have data and accessor property with the same name',
        AccessorGetSet:  'Object literal may not have multiple get/set accessors with the same name',
        StrictLHSAssignment:  'Assignment to eval or arguments is not allowed in strict mode',
        StrictLHSPostfix:  'Postfix increment/decrement may not have eval or arguments operand in strict mode',
        StrictLHSPrefix:  'Prefix increment/decrement may not have eval or arguments operand in strict mode',
        StrictReservedWord:  'Use of future reserved word in strict mode'
    };

    // See also tools/generate-unicode-regex.py.
    Regex = {
        NonAsciiIdentifierStart: new RegExp('[\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]'),
        NonAsciiIdentifierPart: new RegExp('[\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0300-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u0483-\u0487\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u05d0-\u05ea\u05f0-\u05f2\u0610-\u061a\u0620-\u0669\u066e-\u06d3\u06d5-\u06dc\u06df-\u06e8\u06ea-\u06fc\u06ff\u0710-\u074a\u074d-\u07b1\u07c0-\u07f5\u07fa\u0800-\u082d\u0840-\u085b\u08a0\u08a2-\u08ac\u08e4-\u08fe\u0900-\u0963\u0966-\u096f\u0971-\u0977\u0979-\u097f\u0981-\u0983\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bc-\u09c4\u09c7\u09c8\u09cb-\u09ce\u09d7\u09dc\u09dd\u09df-\u09e3\u09e6-\u09f1\u0a01-\u0a03\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a59-\u0a5c\u0a5e\u0a66-\u0a75\u0a81-\u0a83\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abc-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ad0\u0ae0-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3c-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5c\u0b5d\u0b5f-\u0b63\u0b66-\u0b6f\u0b71\u0b82\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd0\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c58\u0c59\u0c60-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbc-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0cde\u0ce0-\u0ce3\u0ce6-\u0cef\u0cf1\u0cf2\u0d02\u0d03\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d-\u0d44\u0d46-\u0d48\u0d4a-\u0d4e\u0d57\u0d60-\u0d63\u0d66-\u0d6f\u0d7a-\u0d7f\u0d82\u0d83\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e01-\u0e3a\u0e40-\u0e4e\u0e50-\u0e59\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb9\u0ebb-\u0ebd\u0ec0-\u0ec4\u0ec6\u0ec8-\u0ecd\u0ed0-\u0ed9\u0edc-\u0edf\u0f00\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e-\u0f47\u0f49-\u0f6c\u0f71-\u0f84\u0f86-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1049\u1050-\u109d\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u135d-\u135f\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176c\u176e-\u1770\u1772\u1773\u1780-\u17d3\u17d7\u17dc\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1820-\u1877\u1880-\u18aa\u18b0-\u18f5\u1900-\u191c\u1920-\u192b\u1930-\u193b\u1946-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u19d0-\u19d9\u1a00-\u1a1b\u1a20-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1aa7\u1b00-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1bf3\u1c00-\u1c37\u1c40-\u1c49\u1c4d-\u1c7d\u1cd0-\u1cd2\u1cd4-\u1cf6\u1d00-\u1de6\u1dfc-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u200c\u200d\u203f\u2040\u2054\u2071\u207f\u2090-\u209c\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d7f-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2de0-\u2dff\u2e2f\u3005-\u3007\u3021-\u302f\u3031-\u3035\u3038-\u303c\u3041-\u3096\u3099\u309a\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua62b\ua640-\ua66f\ua674-\ua67d\ua67f-\ua697\ua69f-\ua6f1\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua827\ua840-\ua873\ua880-\ua8c4\ua8d0-\ua8d9\ua8e0-\ua8f7\ua8fb\ua900-\ua92d\ua930-\ua953\ua960-\ua97c\ua980-\ua9c0\ua9cf-\ua9d9\uaa00-\uaa36\uaa40-\uaa4d\uaa50-\uaa59\uaa60-\uaa76\uaa7a\uaa7b\uaa80-\uaac2\uaadb-\uaadd\uaae0-\uaaef\uaaf2-\uaaf6\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabea\uabec\uabed\uabf0-\uabf9\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\ufe70-\ufe74\ufe76-\ufefc\uff10-\uff19\uff21-\uff3a\uff3f\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]')
    };

    // Ensure the condition is true, otherwise throw an error.
    // This is only to have a better contract semantic, i.e. another safety net
    // to catch a logic error. The condition shall be fulfilled in normal case.
    // Do NOT use this to enforce a certain condition on any user input.

    function assert(condition, message) {
        if (!condition) {
            throw new Error('ASSERT: ' + message);
        }
    }

    function sliceSource(from, to) {
        return source.slice(from, to);
    }

    if (typeof 'esprima'[0] === 'undefined') {
        sliceSource = function sliceArraySource(from, to) {
            return source.slice(from, to).join('');
        };
    }

    function isDecimalDigit(ch) {
        return '0123456789'.indexOf(ch) >= 0;
    }

    function isHexDigit(ch) {
        return '0123456789abcdefABCDEF'.indexOf(ch) >= 0;
    }

    function isOctalDigit(ch) {
        return '01234567'.indexOf(ch) >= 0;
    }


    // 7.2 White Space

    function isWhiteSpace(ch) {
        return (ch === ' ') || (ch === '\u0009') || (ch === '\u000B') ||
            (ch === '\u000C') || (ch === '\u00A0') ||
            (ch.charCodeAt(0) >= 0x1680 &&
             '\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\uFEFF'.indexOf(ch) >= 0);
    }

    // 7.3 Line Terminators

    function isLineTerminator(ch) {
        return (ch === '\n' || ch === '\r' || ch === '\u2028' || ch === '\u2029');
    }

    // 7.6 Identifier Names and Identifiers

    function isIdentifierStart(ch) {
        return (ch === '$') || (ch === '_') || (ch === '\\') ||
            (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
            ((ch.charCodeAt(0) >= 0x80) && Regex.NonAsciiIdentifierStart.test(ch));
    }

    function isIdentifierPart(ch) {
        return (ch === '$') || (ch === '_') || (ch === '\\') ||
            (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
            ((ch >= '0') && (ch <= '9')) ||
            ((ch.charCodeAt(0) >= 0x80) && Regex.NonAsciiIdentifierPart.test(ch));
    }

    // 7.6.1.2 Future Reserved Words

    function isFutureReservedWord(id) {
        switch (id) {

        // Future reserved words.
        case 'class':
        case 'enum':
        case 'export':
        case 'extends':
        case 'import':
        case 'super':
            return true;
        }

        return false;
    }

    function isStrictModeReservedWord(id) {
        switch (id) {

        // Strict Mode reserved words.
        case 'implements':
        case 'interface':
        case 'package':
        case 'private':
        case 'protected':
        case 'public':
        case 'static':
        case 'yield':
        case 'let':
            return true;
        }

        return false;
    }

    function isRestrictedWord(id) {
        return id === 'eval' || id === 'arguments';
    }

    // 7.6.1.1 Keywords

    function isKeyword(id) {
        var keyword = false;
        switch (id.length) {
        case 2:
            keyword = (id === 'if') || (id === 'in') || (id === 'do');
            break;
        case 3:
            keyword = (id === 'var') || (id === 'for') || (id === 'new') || (id === 'try');
            break;
        case 4:
            keyword = (id === 'this') || (id === 'else') || (id === 'case') || (id === 'void') || (id === 'with');
            break;
        case 5:
            keyword = (id === 'while') || (id === 'break') || (id === 'catch') || (id === 'throw');
            break;
        case 6:
            keyword = (id === 'return') || (id === 'typeof') || (id === 'delete') || (id === 'switch');
            break;
        case 7:
            keyword = (id === 'default') || (id === 'finally');
            break;
        case 8:
            keyword = (id === 'function') || (id === 'continue') || (id === 'debugger');
            break;
        case 10:
            keyword = (id === 'instanceof');
            break;
        }

        if (keyword) {
            return true;
        }

        switch (id) {
        // Future reserved words.
        // 'const' is specialized as Keyword in V8.
        case 'const':
            return true;

        // For compatiblity to SpiderMonkey and ES.next
        case 'yield':
        case 'let':
            return true;
        }

        if (strict && isStrictModeReservedWord(id)) {
            return true;
        }

        return isFutureReservedWord(id);
    }

    // 7.4 Comments

    function skipComment() {
        var ch, blockComment, lineComment;

        blockComment = false;
        lineComment = false;

        while (index < length) {
            ch = source[index];

            if (lineComment) {
                ch = source[index++];
                if (isLineTerminator(ch)) {
                    lineComment = false;
                    if (ch === '\r' && source[index] === '\n') {
                        ++index;
                    }
                    ++lineNumber;
                    lineStart = index;
                }
            } else if (blockComment) {
                if (isLineTerminator(ch)) {
                    if (ch === '\r' && source[index + 1] === '\n') {
                        ++index;
                    }
                    ++lineNumber;
                    ++index;
                    lineStart = index;
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    ch = source[index++];
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                    if (ch === '*') {
                        ch = source[index];
                        if (ch === '/') {
                            ++index;
                            blockComment = false;
                        }
                    }
                }
            } else if (ch === '/') {
                ch = source[index + 1];
                if (ch === '/') {
                    index += 2;
                    lineComment = true;
                } else if (ch === '*') {
                    index += 2;
                    blockComment = true;
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    break;
                }
            } else if (isWhiteSpace(ch)) {
                ++index;
            } else if (isLineTerminator(ch)) {
                ++index;
                if (ch ===  '\r' && source[index] === '\n') {
                    ++index;
                }
                ++lineNumber;
                lineStart = index;
            } else {
                break;
            }
        }
    }

    function scanHexEscape(prefix) {
        var i, len, ch, code = 0;

        len = (prefix === 'u') ? 4 : 2;
        for (i = 0; i < len; ++i) {
            if (index < length && isHexDigit(source[index])) {
                ch = source[index++];
                code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
            } else {
                return '';
            }
        }
        return String.fromCharCode(code);
    }

    function scanIdentifier() {
        var ch, start, id, restore;

        ch = source[index];
        if (!isIdentifierStart(ch)) {
            return;
        }

        start = index;
        if (ch === '\\') {
            ++index;
            if (source[index] !== 'u') {
                return;
            }
            ++index;
            restore = index;
            ch = scanHexEscape('u');
            if (ch) {
                if (ch === '\\' || !isIdentifierStart(ch)) {
                    return;
                }
                id = ch;
            } else {
                index = restore;
                id = 'u';
            }
        } else {
            id = source[index++];
        }

        while (index < length) {
            ch = source[index];
            if (!isIdentifierPart(ch)) {
                break;
            }
            if (ch === '\\') {
                ++index;
                if (source[index] !== 'u') {
                    return;
                }
                ++index;
                restore = index;
                ch = scanHexEscape('u');
                if (ch) {
                    if (ch === '\\' || !isIdentifierPart(ch)) {
                        return;
                    }
                    id += ch;
                } else {
                    index = restore;
                    id += 'u';
                }
            } else {
                id += source[index++];
            }
        }

        // There is no keyword or literal with only one character.
        // Thus, it must be an identifier.
        if (id.length === 1) {
            return {
                type: Token.Identifier,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (isKeyword(id)) {
            return {
                type: Token.Keyword,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // 7.8.1 Null Literals

        if (id === 'null') {
            return {
                type: Token.NullLiteral,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // 7.8.2 Boolean Literals

        if (id === 'true' || id === 'false') {
            return {
                type: Token.BooleanLiteral,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        return {
            type: Token.Identifier,
            value: id,
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    // 7.7 Punctuators

    function scanPunctuator() {
        var start = index,
            ch1 = source[index],
            ch2,
            ch3,
            ch4;

        // Check for most common single-character punctuators.

        if (ch1 === ';' || ch1 === '{' || ch1 === '}') {
            ++index;
            return {
                type: Token.Punctuator,
                value: ch1,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === ',' || ch1 === '(' || ch1 === ')') {
            ++index;
            return {
                type: Token.Punctuator,
                value: ch1,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // Dot (.) can also start a floating-point number, hence the need
        // to check the next character.

        ch2 = source[index + 1];
        if (ch1 === '.' && !isDecimalDigit(ch2)) {
            return {
                type: Token.Punctuator,
                value: source[index++],
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // Peek more characters.

        ch3 = source[index + 2];
        ch4 = source[index + 3];

        // 4-character punctuator: >>>=

        if (ch1 === '>' && ch2 === '>' && ch3 === '>') {
            if (ch4 === '=') {
                index += 4;
                return {
                    type: Token.Punctuator,
                    value: '>>>=',
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
        }

        // 3-character punctuators: === !== >>> <<= >>=

        if (ch1 === '=' && ch2 === '=' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '===',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '!' && ch2 === '=' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '!==',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '>' && ch2 === '>' && ch3 === '>') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '>>>',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '<' && ch2 === '<' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '<<=',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '>' && ch2 === '>' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '>>=',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // 2-character punctuators: <= >= == != ++ -- << >> && ||
        // += -= *= %= &= |= ^= /=

        if (ch2 === '=') {
            if ('<>=!+-*%&|^/'.indexOf(ch1) >= 0) {
                index += 2;
                return {
                    type: Token.Punctuator,
                    value: ch1 + ch2,
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
        }

        if (ch1 === ch2 && ('+-<>&|'.indexOf(ch1) >= 0)) {
            if ('+-<>&|'.indexOf(ch2) >= 0) {
                index += 2;
                return {
                    type: Token.Punctuator,
                    value: ch1 + ch2,
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
        }

        // The remaining 1-character punctuators.

        if ('[]<>+-*%&|^!~?:=/'.indexOf(ch1) >= 0) {
            return {
                type: Token.Punctuator,
                value: source[index++],
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }
    }

    // 7.8.3 Numeric Literals

    function scanNumericLiteral() {
        var number, start, ch;

        ch = source[index];
        assert(isDecimalDigit(ch) || (ch === '.'),
            'Numeric literal must start with a decimal digit or a decimal point');

        start = index;
        number = '';
        if (ch !== '.') {
            number = source[index++];
            ch = source[index];

            // Hex number starts with '0x'.
            // Octal number starts with '0'.
            if (number === '0') {
                if (ch === 'x' || ch === 'X') {
                    number += source[index++];
                    while (index < length) {
                        ch = source[index];
                        if (!isHexDigit(ch)) {
                            break;
                        }
                        number += source[index++];
                    }

                    if (number.length <= 2) {
                        // only 0x
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }

                    if (index < length) {
                        ch = source[index];
                        if (isIdentifierStart(ch)) {
                            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                        }
                    }
                    return {
                        type: Token.NumericLiteral,
                        value: parseInt(number, 16),
                        lineNumber: lineNumber,
                        lineStart: lineStart,
                        range: [start, index]
                    };
                } else if (isOctalDigit(ch)) {
                    number += source[index++];
                    while (index < length) {
                        ch = source[index];
                        if (!isOctalDigit(ch)) {
                            break;
                        }
                        number += source[index++];
                    }

                    if (index < length) {
                        ch = source[index];
                        if (isIdentifierStart(ch) || isDecimalDigit(ch)) {
                            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                        }
                    }
                    return {
                        type: Token.NumericLiteral,
                        value: parseInt(number, 8),
                        octal: true,
                        lineNumber: lineNumber,
                        lineStart: lineStart,
                        range: [start, index]
                    };
                }

                // decimal number starts with '0' such as '09' is illegal.
                if (isDecimalDigit(ch)) {
                    throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                }
            }

            while (index < length) {
                ch = source[index];
                if (!isDecimalDigit(ch)) {
                    break;
                }
                number += source[index++];
            }
        }

        if (ch === '.') {
            number += source[index++];
            while (index < length) {
                ch = source[index];
                if (!isDecimalDigit(ch)) {
                    break;
                }
                number += source[index++];
            }
        }

        if (ch === 'e' || ch === 'E') {
            number += source[index++];

            ch = source[index];
            if (ch === '+' || ch === '-') {
                number += source[index++];
            }

            ch = source[index];
            if (isDecimalDigit(ch)) {
                number += source[index++];
                while (index < length) {
                    ch = source[index];
                    if (!isDecimalDigit(ch)) {
                        break;
                    }
                    number += source[index++];
                }
            } else {
                ch = 'character ' + ch;
                if (index >= length) {
                    ch = '<end>';
                }
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
        }

        if (index < length) {
            ch = source[index];
            if (isIdentifierStart(ch)) {
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
        }

        return {
            type: Token.NumericLiteral,
            value: parseFloat(number),
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    // 7.8.4 String Literals

    function scanStringLiteral() {
        var str = '', quote, start, ch, code, unescaped, restore, octal = false;

        quote = source[index];
        assert((quote === '\'' || quote === '"'),
            'String literal must starts with a quote');

        start = index;
        ++index;

        while (index < length) {
            ch = source[index++];

            if (ch === quote) {
                quote = '';
                break;
            } else if (ch === '\\') {
                ch = source[index++];
                if (!isLineTerminator(ch)) {
                    switch (ch) {
                    case 'n':
                        str += '\n';
                        break;
                    case 'r':
                        str += '\r';
                        break;
                    case 't':
                        str += '\t';
                        break;
                    case 'u':
                    case 'x':
                        restore = index;
                        unescaped = scanHexEscape(ch);
                        if (unescaped) {
                            str += unescaped;
                        } else {
                            index = restore;
                            str += ch;
                        }
                        break;
                    case 'b':
                        str += '\b';
                        break;
                    case 'f':
                        str += '\f';
                        break;
                    case 'v':
                        str += '\x0B';
                        break;

                    default:
                        if (isOctalDigit(ch)) {
                            code = '01234567'.indexOf(ch);

                            // \0 is not octal escape sequence
                            if (code !== 0) {
                                octal = true;
                            }

                            if (index < length && isOctalDigit(source[index])) {
                                octal = true;
                                code = code * 8 + '01234567'.indexOf(source[index++]);

                                // 3 digits are only allowed when string starts
                                // with 0, 1, 2, 3
                                if ('0123'.indexOf(ch) >= 0 &&
                                        index < length &&
                                        isOctalDigit(source[index])) {
                                    code = code * 8 + '01234567'.indexOf(source[index++]);
                                }
                            }
                            str += String.fromCharCode(code);
                        } else {
                            str += ch;
                        }
                        break;
                    }
                } else {
                    ++lineNumber;
                    if (ch ===  '\r' && source[index] === '\n') {
                        ++index;
                    }
                }
            } else if (isLineTerminator(ch)) {
                break;
            } else {
                str += ch;
            }
        }

        if (quote !== '') {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }

        return {
            type: Token.StringLiteral,
            value: str,
            octal: octal,
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    function scanRegExp() {
        var str, ch, start, pattern, flags, value, classMarker = false, restore, terminated = false;

        buffer = null;
        skipComment();

        start = index;
        ch = source[index];
        assert(ch === '/', 'Regular expression literal must start with a slash');
        str = source[index++];

        while (index < length) {
            ch = source[index++];
            str += ch;
            if (classMarker) {
                if (ch === ']') {
                    classMarker = false;
                }
            } else {
                if (ch === '\\') {
                    ch = source[index++];
                    // ECMA-262 7.8.5
                    if (isLineTerminator(ch)) {
                        throwError({}, Messages.UnterminatedRegExp);
                    }
                    str += ch;
                } else if (ch === '/') {
                    terminated = true;
                    break;
                } else if (ch === '[') {
                    classMarker = true;
                } else if (isLineTerminator(ch)) {
                    throwError({}, Messages.UnterminatedRegExp);
                }
            }
        }

        if (!terminated) {
            throwError({}, Messages.UnterminatedRegExp);
        }

        // Exclude leading and trailing slash.
        pattern = str.substr(1, str.length - 2);

        flags = '';
        while (index < length) {
            ch = source[index];
            if (!isIdentifierPart(ch)) {
                break;
            }

            ++index;
            if (ch === '\\' && index < length) {
                ch = source[index];
                if (ch === 'u') {
                    ++index;
                    restore = index;
                    ch = scanHexEscape('u');
                    if (ch) {
                        flags += ch;
                        str += '\\u';
                        for (; restore < index; ++restore) {
                            str += source[restore];
                        }
                    } else {
                        index = restore;
                        flags += 'u';
                        str += '\\u';
                    }
                } else {
                    str += '\\';
                }
            } else {
                flags += ch;
                str += ch;
            }
        }

        try {
            value = new RegExp(pattern, flags);
        } catch (e) {
            throwError({}, Messages.InvalidRegExp);
        }

        return {
            literal: str,
            value: value,
            range: [start, index]
        };
    }

    function isIdentifierName(token) {
        return token.type === Token.Identifier ||
            token.type === Token.Keyword ||
            token.type === Token.BooleanLiteral ||
            token.type === Token.NullLiteral;
    }

    function advance() {
        var ch, token;

        skipComment();

        if (index >= length) {
            return {
                type: Token.EOF,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [index, index]
            };
        }

        token = scanPunctuator();
        if (typeof token !== 'undefined') {
            return token;
        }

        ch = source[index];

        if (ch === '\'' || ch === '"') {
            return scanStringLiteral();
        }

        if (ch === '.' || isDecimalDigit(ch)) {
            return scanNumericLiteral();
        }

        token = scanIdentifier();
        if (typeof token !== 'undefined') {
            return token;
        }

        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
    }

    function lex() {
        var token;

        if (buffer) {
            index = buffer.range[1];
            lineNumber = buffer.lineNumber;
            lineStart = buffer.lineStart;
            token = buffer;
            buffer = null;
            return token;
        }

        buffer = null;
        return advance();
    }

    function lookahead() {
        var pos, line, start;

        if (buffer !== null) {
            return buffer;
        }

        pos = index;
        line = lineNumber;
        start = lineStart;
        buffer = advance();
        index = pos;
        lineNumber = line;
        lineStart = start;

        return buffer;
    }

    // Return true if there is a line terminator before the next token.

    function peekLineTerminator() {
        var pos, line, start, found;

        pos = index;
        line = lineNumber;
        start = lineStart;
        skipComment();
        found = lineNumber !== line;
        index = pos;
        lineNumber = line;
        lineStart = start;

        return found;
    }

    // Throw an exception

    function throwError(token, messageFormat) {
        var error,
            args = Array.prototype.slice.call(arguments, 2),
            msg = messageFormat.replace(
                /%(\d)/g,
                function (whole, index) {
                    return args[index] || '';
                }
            );

        if (typeof token.lineNumber === 'number') {
            error = new Error('Line ' + token.lineNumber + ': ' + msg);
            error.index = token.range[0];
            error.lineNumber = token.lineNumber;
            error.column = token.range[0] - lineStart + 1;
        } else {
            error = new Error('Line ' + lineNumber + ': ' + msg);
            error.index = index;
            error.lineNumber = lineNumber;
            error.column = index - lineStart + 1;
        }

        throw error;
    }

    function throwErrorTolerant() {
        try {
            throwError.apply(null, arguments);
        } catch (e) {
            if (extra.errors) {
                extra.errors.push(e);
            } else {
                throw e;
            }
        }
    }


    // Throw an exception because of the token.

    function throwUnexpected(token) {
        if (token.type === Token.EOF) {
            throwError(token, Messages.UnexpectedEOS);
        }

        if (token.type === Token.NumericLiteral) {
            throwError(token, Messages.UnexpectedNumber);
        }

        if (token.type === Token.StringLiteral) {
            throwError(token, Messages.UnexpectedString);
        }

        if (token.type === Token.Identifier) {
            throwError(token, Messages.UnexpectedIdentifier);
        }

        if (token.type === Token.Keyword) {
            if (isFutureReservedWord(token.value)) {
                throwError(token, Messages.UnexpectedReserved);
            } else if (strict && isStrictModeReservedWord(token.value)) {
                throwErrorTolerant(token, Messages.StrictReservedWord);
                return;
            }
            throwError(token, Messages.UnexpectedToken, token.value);
        }

        // BooleanLiteral, NullLiteral, or Punctuator.
        throwError(token, Messages.UnexpectedToken, token.value);
    }

    // Expect the next token to match the specified punctuator.
    // If not, an exception will be thrown.

    function expect(value) {
        var token = lex();
        if (token.type !== Token.Punctuator || token.value !== value) {
            throwUnexpected(token);
        }
    }

    // Expect the next token to match the specified keyword.
    // If not, an exception will be thrown.

    function expectKeyword(keyword) {
        var token = lex();
        if (token.type !== Token.Keyword || token.value !== keyword) {
            throwUnexpected(token);
        }
    }

    // Return true if the next token matches the specified punctuator.

    function match(value) {
        var token = lookahead();
        return token.type === Token.Punctuator && token.value === value;
    }

    // Return true if the next token matches the specified keyword

    function matchKeyword(keyword) {
        var token = lookahead();
        return token.type === Token.Keyword && token.value === keyword;
    }

    // Return true if the next token is an assignment operator

    function matchAssign() {
        var token = lookahead(),
            op = token.value;

        if (token.type !== Token.Punctuator) {
            return false;
        }
        return op === '=' ||
            op === '*=' ||
            op === '/=' ||
            op === '%=' ||
            op === '+=' ||
            op === '-=' ||
            op === '<<=' ||
            op === '>>=' ||
            op === '>>>=' ||
            op === '&=' ||
            op === '^=' ||
            op === '|=';
    }

    function consumeSemicolon() {
        var token, line;

        // Catch the very common case first.
        if (source[index] === ';') {
            lex();
            return;
        }

        line = lineNumber;
        skipComment();
        if (lineNumber !== line) {
            return;
        }

        if (match(';')) {
            lex();
            return;
        }

        token = lookahead();
        if (token.type !== Token.EOF && !match('}')) {
            throwUnexpected(token);
        }
    }

    // Return true if provided expression is LeftHandSideExpression

    function isLeftHandSide(expr) {
        return expr.type === Syntax.Identifier || expr.type === Syntax.MemberExpression;
    }

    // 11.1.4 Array Initialiser

    function parseArrayInitialiser() {
        var elements = [];

        expect('[');

        while (!match(']')) {
            if (match(',')) {
                lex();
                elements.push(null);
            } else {
                elements.push(parseAssignmentExpression());

                if (!match(']')) {
                    expect(',');
                }
            }
        }

        expect(']');

        return {
            type: Syntax.ArrayExpression,
            elements: elements
        };
    }

    // 11.1.5 Object Initialiser

    function parsePropertyFunction(param, first) {
        var previousStrict, body;

        previousStrict = strict;
        body = parseFunctionSourceElements();
        if (first && strict && isRestrictedWord(param[0].name)) {
            throwErrorTolerant(first, Messages.StrictParamName);
        }
        strict = previousStrict;

        return {
            type: Syntax.FunctionExpression,
            id: null,
            params: param,
            defaults: [],
            body: body,
            rest: null,
            generator: false,
            expression: false
        };
    }

    function parseObjectPropertyKey() {
        var token = lex();

        // Note: This function is called only from parseObjectProperty(), where
        // EOF and Punctuator tokens are already filtered out.

        if (token.type === Token.StringLiteral || token.type === Token.NumericLiteral) {
            if (strict && token.octal) {
                throwErrorTolerant(token, Messages.StrictOctalLiteral);
            }
            return createLiteral(token);
        }

        return {
            type: Syntax.Identifier,
            name: token.value
        };
    }

    function parseObjectProperty() {
        var token, key, id, param;

        token = lookahead();

        if (token.type === Token.Identifier) {

            id = parseObjectPropertyKey();

            // Property Assignment: Getter and Setter.

            if (token.value === 'get' && !match(':')) {
                key = parseObjectPropertyKey();
                expect('(');
                expect(')');
                return {
                    type: Syntax.Property,
                    key: key,
                    value: parsePropertyFunction([]),
                    kind: 'get'
                };
            } else if (token.value === 'set' && !match(':')) {
                key = parseObjectPropertyKey();
                expect('(');
                token = lookahead();
                if (token.type !== Token.Identifier) {
                    expect(')');
                    throwErrorTolerant(token, Messages.UnexpectedToken, token.value);
                    return {
                        type: Syntax.Property,
                        key: key,
                        value: parsePropertyFunction([]),
                        kind: 'set'
                    };
                } else {
                    param = [ parseVariableIdentifier() ];
                    expect(')');
                    return {
                        type: Syntax.Property,
                        key: key,
                        value: parsePropertyFunction(param, token),
                        kind: 'set'
                    };
                }
            } else {
                expect(':');
                return {
                    type: Syntax.Property,
                    key: id,
                    value: parseAssignmentExpression(),
                    kind: 'init'
                };
            }
        } else if (token.type === Token.EOF || token.type === Token.Punctuator) {
            throwUnexpected(token);
        } else {
            key = parseObjectPropertyKey();
            expect(':');
            return {
                type: Syntax.Property,
                key: key,
                value: parseAssignmentExpression(),
                kind: 'init'
            };
        }
    }

    function parseObjectInitialiser() {
        var properties = [], property, name, kind, map = {}, toString = String;

        expect('{');

        while (!match('}')) {
            property = parseObjectProperty();

            if (property.key.type === Syntax.Identifier) {
                name = property.key.name;
            } else {
                name = toString(property.key.value);
            }
            kind = (property.kind === 'init') ? PropertyKind.Data : (property.kind === 'get') ? PropertyKind.Get : PropertyKind.Set;
            if (Object.prototype.hasOwnProperty.call(map, name)) {
                if (map[name] === PropertyKind.Data) {
                    if (strict && kind === PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.StrictDuplicateProperty);
                    } else if (kind !== PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.AccessorDataProperty);
                    }
                } else {
                    if (kind === PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.AccessorDataProperty);
                    } else if (map[name] & kind) {
                        throwErrorTolerant({}, Messages.AccessorGetSet);
                    }
                }
                map[name] |= kind;
            } else {
                map[name] = kind;
            }

            properties.push(property);

            if (!match('}')) {
                expect(',');
            }
        }

        expect('}');

        return {
            type: Syntax.ObjectExpression,
            properties: properties
        };
    }

    // 11.1.6 The Grouping Operator

    function parseGroupExpression() {
        var expr;

        expect('(');

        expr = parseExpression();

        expect(')');

        return expr;
    }


    // 11.1 Primary Expressions

    function parsePrimaryExpression() {
        var token = lookahead(),
            type = token.type;

        if (type === Token.Identifier) {
            return {
                type: Syntax.Identifier,
                name: lex().value
            };
        }

        if (type === Token.StringLiteral || type === Token.NumericLiteral) {
            if (strict && token.octal) {
                throwErrorTolerant(token, Messages.StrictOctalLiteral);
            }
            return createLiteral(lex());
        }

        if (type === Token.Keyword) {
            if (matchKeyword('this')) {
                lex();
                return {
                    type: Syntax.ThisExpression
                };
            }

            if (matchKeyword('function')) {
                return parseFunctionExpression();
            }
        }

        if (type === Token.BooleanLiteral) {
            lex();
            token.value = (token.value === 'true');
            return createLiteral(token);
        }

        if (type === Token.NullLiteral) {
            lex();
            token.value = null;
            return createLiteral(token);
        }

        if (match('[')) {
            return parseArrayInitialiser();
        }

        if (match('{')) {
            return parseObjectInitialiser();
        }

        if (match('(')) {
            return parseGroupExpression();
        }

        if (match('/') || match('/=')) {
            return createLiteral(scanRegExp());
        }

        return throwUnexpected(lex());
    }

    // 11.2 Left-Hand-Side Expressions

    function parseArguments() {
        var args = [];

        expect('(');

        if (!match(')')) {
            while (index < length) {
                args.push(parseAssignmentExpression());
                if (match(')')) {
                    break;
                }
                expect(',');
            }
        }

        expect(')');

        return args;
    }

    function parseNonComputedProperty() {
        var token = lex();

        if (!isIdentifierName(token)) {
            throwUnexpected(token);
        }

        return {
            type: Syntax.Identifier,
            name: token.value
        };
    }

    function parseNonComputedMember() {
        expect('.');

        return parseNonComputedProperty();
    }

    function parseComputedMember() {
        var expr;

        expect('[');

        expr = parseExpression();

        expect(']');

        return expr;
    }

    function parseNewExpression() {
        var expr;

        expectKeyword('new');

        expr = {
            type: Syntax.NewExpression,
            callee: parseLeftHandSideExpression(),
            'arguments': []
        };

        if (match('(')) {
            expr['arguments'] = parseArguments();
        }

        return expr;
    }

    function parseLeftHandSideExpressionAllowCall() {
        var expr;

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[') || match('(')) {
            if (match('(')) {
                expr = {
                    type: Syntax.CallExpression,
                    callee: expr,
                    'arguments': parseArguments()
                };
            } else if (match('[')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: true,
                    object: expr,
                    property: parseComputedMember()
                };
            } else {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: false,
                    object: expr,
                    property: parseNonComputedMember()
                };
            }
        }

        return expr;
    }


    function parseLeftHandSideExpression() {
        var expr;

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[')) {
            if (match('[')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: true,
                    object: expr,
                    property: parseComputedMember()
                };
            } else {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: false,
                    object: expr,
                    property: parseNonComputedMember()
                };
            }
        }

        return expr;
    }

    // 11.3 Postfix Expressions

    function parsePostfixExpression() {
        var expr = parseLeftHandSideExpressionAllowCall(), token;

        token = lookahead();
        if (token.type !== Token.Punctuator) {
            return expr;
        }

        if ((match('++') || match('--')) && !peekLineTerminator()) {
            // 11.3.1, 11.3.2
            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                throwErrorTolerant({}, Messages.StrictLHSPostfix);
            }

            if (!isLeftHandSide(expr)) {
                throwError({}, Messages.InvalidLHSInAssignment);
            }

            expr = {
                type: Syntax.UpdateExpression,
                operator: lex().value,
                argument: expr,
                prefix: false
            };
        }

        return expr;
    }

    // 11.4 Unary Operators

    function parseUnaryExpression() {
        var token, expr;

        token = lookahead();
        if (token.type !== Token.Punctuator && token.type !== Token.Keyword) {
            return parsePostfixExpression();
        }

        if (match('++') || match('--')) {
            token = lex();
            expr = parseUnaryExpression();
            // 11.4.4, 11.4.5
            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                throwErrorTolerant({}, Messages.StrictLHSPrefix);
            }

            if (!isLeftHandSide(expr)) {
                throwError({}, Messages.InvalidLHSInAssignment);
            }

            expr = {
                type: Syntax.UpdateExpression,
                operator: token.value,
                argument: expr,
                prefix: true
            };
            return expr;
        }

        if (match('+') || match('-') || match('~') || match('!')) {
            expr = {
                type: Syntax.UnaryExpression,
                operator: lex().value,
                argument: parseUnaryExpression(),
                prefix: true
            };
            return expr;
        }

        if (matchKeyword('delete') || matchKeyword('void') || matchKeyword('typeof')) {
            expr = {
                type: Syntax.UnaryExpression,
                operator: lex().value,
                argument: parseUnaryExpression(),
                prefix: true
            };
            if (strict && expr.operator === 'delete' && expr.argument.type === Syntax.Identifier) {
                throwErrorTolerant({}, Messages.StrictDelete);
            }
            return expr;
        }

        return parsePostfixExpression();
    }

    // 11.5 Multiplicative Operators

    function parseMultiplicativeExpression() {
        var expr = parseUnaryExpression();

        while (match('*') || match('/') || match('%')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseUnaryExpression()
            };
        }

        return expr;
    }

    // 11.6 Additive Operators

    function parseAdditiveExpression() {
        var expr = parseMultiplicativeExpression();

        while (match('+') || match('-')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseMultiplicativeExpression()
            };
        }

        return expr;
    }

    // 11.7 Bitwise Shift Operators

    function parseShiftExpression() {
        var expr = parseAdditiveExpression();

        while (match('<<') || match('>>') || match('>>>')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseAdditiveExpression()
            };
        }

        return expr;
    }
    // 11.8 Relational Operators

    function parseRelationalExpression() {
        var expr, previousAllowIn;

        previousAllowIn = state.allowIn;
        state.allowIn = true;

        expr = parseShiftExpression();

        while (match('<') || match('>') || match('<=') || match('>=') || (previousAllowIn && matchKeyword('in')) || matchKeyword('instanceof')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseShiftExpression()
            };
        }

        state.allowIn = previousAllowIn;
        return expr;
    }

    // 11.9 Equality Operators

    function parseEqualityExpression() {
        var expr = parseRelationalExpression();

        while (match('==') || match('!=') || match('===') || match('!==')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseRelationalExpression()
            };
        }

        return expr;
    }

    // 11.10 Binary Bitwise Operators

    function parseBitwiseANDExpression() {
        var expr = parseEqualityExpression();

        while (match('&')) {
            lex();
            expr = {
                type: Syntax.BinaryExpression,
                operator: '&',
                left: expr,
                right: parseEqualityExpression()
            };
        }

        return expr;
    }

    function parseBitwiseXORExpression() {
        var expr = parseBitwiseANDExpression();

        while (match('^')) {
            lex();
            expr = {
                type: Syntax.BinaryExpression,
                operator: '^',
                left: expr,
                right: parseBitwiseANDExpression()
            };
        }

        return expr;
    }

    function parseBitwiseORExpression() {
        var expr = parseBitwiseXORExpression();

        while (match('|')) {
            lex();
            expr = {
                type: Syntax.BinaryExpression,
                operator: '|',
                left: expr,
                right: parseBitwiseXORExpression()
            };
        }

        return expr;
    }

    // 11.11 Binary Logical Operators

    function parseLogicalANDExpression() {
        var expr = parseBitwiseORExpression();

        while (match('&&')) {
            lex();
            expr = {
                type: Syntax.LogicalExpression,
                operator: '&&',
                left: expr,
                right: parseBitwiseORExpression()
            };
        }

        return expr;
    }

    function parseLogicalORExpression() {
        var expr = parseLogicalANDExpression();

        while (match('||')) {
            lex();
            expr = {
                type: Syntax.LogicalExpression,
                operator: '||',
                left: expr,
                right: parseLogicalANDExpression()
            };
        }

        return expr;
    }

    // 11.12 Conditional Operator

    function parseConditionalExpression() {
        var expr, previousAllowIn, consequent;

        expr = parseLogicalORExpression();

        if (match('?')) {
            lex();
            previousAllowIn = state.allowIn;
            state.allowIn = true;
            consequent = parseAssignmentExpression();
            state.allowIn = previousAllowIn;
            expect(':');

            expr = {
                type: Syntax.ConditionalExpression,
                test: expr,
                consequent: consequent,
                alternate: parseAssignmentExpression()
            };
        }

        return expr;
    }

    // 11.13 Assignment Operators

    function parseAssignmentExpression() {
        var token, expr;

        token = lookahead();
        expr = parseConditionalExpression();

        if (matchAssign()) {
            // LeftHandSideExpression
            if (!isLeftHandSide(expr)) {
                throwError({}, Messages.InvalidLHSInAssignment);
            }

            // 11.13.1
            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                throwErrorTolerant(token, Messages.StrictLHSAssignment);
            }

            expr = {
                type: Syntax.AssignmentExpression,
                operator: lex().value,
                left: expr,
                right: parseAssignmentExpression()
            };
        }

        return expr;
    }

    // 11.14 Comma Operator

    function parseExpression() {
        var expr = parseAssignmentExpression();

        if (match(',')) {
            expr = {
                type: Syntax.SequenceExpression,
                expressions: [ expr ]
            };

            while (index < length) {
                if (!match(',')) {
                    break;
                }
                lex();
                expr.expressions.push(parseAssignmentExpression());
            }

        }
        return expr;
    }

    // 12.1 Block

    function parseStatementList() {
        var list = [],
            statement;

        while (index < length) {
            if (match('}')) {
                break;
            }
            statement = parseSourceElement();
            if (typeof statement === 'undefined') {
                break;
            }
            list.push(statement);
        }

        return list;
    }

    function parseBlock() {
        var block;

        expect('{');

        block = parseStatementList();

        expect('}');

        return {
            type: Syntax.BlockStatement,
            body: block
        };
    }

    // 12.2 Variable Statement

    function parseVariableIdentifier() {
        var token = lex();

        if (token.type !== Token.Identifier) {
            throwUnexpected(token);
        }

        return {
            type: Syntax.Identifier,
            name: token.value
        };
    }

    function parseVariableDeclaration(kind) {
        var id = parseVariableIdentifier(),
            init = null;

        // 12.2.1
        if (strict && isRestrictedWord(id.name)) {
            throwErrorTolerant({}, Messages.StrictVarName);
        }

        if (kind === 'const') {
            expect('=');
            init = parseAssignmentExpression();
        } else if (match('=')) {
            lex();
            init = parseAssignmentExpression();
        }

        return {
            type: Syntax.VariableDeclarator,
            id: id,
            init: init
        };
    }

    function parseVariableDeclarationList(kind) {
        var list = [];

        do {
            list.push(parseVariableDeclaration(kind));
            if (!match(',')) {
                break;
            }
            lex();
        } while (index < length);

        return list;
    }

    function parseVariableStatement() {
        var declarations;

        expectKeyword('var');

        declarations = parseVariableDeclarationList();

        consumeSemicolon();

        return {
            type: Syntax.VariableDeclaration,
            declarations: declarations,
            kind: 'var'
        };
    }

    // kind may be `const` or `let`
    // Both are experimental and not in the specification yet.
    // see http://wiki.ecmascript.org/doku.php?id=harmony:const
    // and http://wiki.ecmascript.org/doku.php?id=harmony:let
    function parseConstLetDeclaration(kind) {
        var declarations;

        expectKeyword(kind);

        declarations = parseVariableDeclarationList(kind);

        consumeSemicolon();

        return {
            type: Syntax.VariableDeclaration,
            declarations: declarations,
            kind: kind
        };
    }

    // 12.3 Empty Statement

    function parseEmptyStatement() {
        expect(';');

        return {
            type: Syntax.EmptyStatement
        };
    }

    // 12.4 Expression Statement

    function parseExpressionStatement() {
        var expr = parseExpression();

        consumeSemicolon();

        return {
            type: Syntax.ExpressionStatement,
            expression: expr
        };
    }

    // 12.5 If statement

    function parseIfStatement() {
        var test, consequent, alternate;

        expectKeyword('if');

        expect('(');

        test = parseExpression();

        expect(')');

        consequent = parseStatement();

        if (matchKeyword('else')) {
            lex();
            alternate = parseStatement();
        } else {
            alternate = null;
        }

        return {
            type: Syntax.IfStatement,
            test: test,
            consequent: consequent,
            alternate: alternate
        };
    }

    // 12.6 Iteration Statements

    function parseDoWhileStatement() {
        var body, test, oldInIteration;

        expectKeyword('do');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        expectKeyword('while');

        expect('(');

        test = parseExpression();

        expect(')');

        if (match(';')) {
            lex();
        }

        return {
            type: Syntax.DoWhileStatement,
            body: body,
            test: test
        };
    }

    function parseWhileStatement() {
        var test, body, oldInIteration;

        expectKeyword('while');

        expect('(');

        test = parseExpression();

        expect(')');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        return {
            type: Syntax.WhileStatement,
            test: test,
            body: body
        };
    }

    function parseForVariableDeclaration() {
        var token = lex();

        return {
            type: Syntax.VariableDeclaration,
            declarations: parseVariableDeclarationList(),
            kind: token.value
        };
    }

    function parseForStatement() {
        var init, test, update, left, right, body, oldInIteration;

        init = test = update = null;

        expectKeyword('for');

        expect('(');

        if (match(';')) {
            lex();
        } else {
            if (matchKeyword('var') || matchKeyword('let')) {
                state.allowIn = false;
                init = parseForVariableDeclaration();
                state.allowIn = true;

                if (init.declarations.length === 1 && matchKeyword('in')) {
                    lex();
                    left = init;
                    right = parseExpression();
                    init = null;
                }
            } else {
                state.allowIn = false;
                init = parseExpression();
                state.allowIn = true;

                if (matchKeyword('in')) {
                    // LeftHandSideExpression
                    if (!isLeftHandSide(init)) {
                        throwError({}, Messages.InvalidLHSInForIn);
                    }

                    lex();
                    left = init;
                    right = parseExpression();
                    init = null;
                }
            }

            if (typeof left === 'undefined') {
                expect(';');
            }
        }

        if (typeof left === 'undefined') {

            if (!match(';')) {
                test = parseExpression();
            }
            expect(';');

            if (!match(')')) {
                update = parseExpression();
            }
        }

        expect(')');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        if (typeof left === 'undefined') {
            return {
                type: Syntax.ForStatement,
                init: init,
                test: test,
                update: update,
                body: body
            };
        }

        return {
            type: Syntax.ForInStatement,
            left: left,
            right: right,
            body: body,
            each: false
        };
    }

    // 12.7 The continue statement

    function parseContinueStatement() {
        var token, label = null;

        expectKeyword('continue');

        // Optimize the most common form: 'continue;'.
        if (source[index] === ';') {
            lex();

            if (!state.inIteration) {
                throwError({}, Messages.IllegalContinue);
            }

            return {
                type: Syntax.ContinueStatement,
                label: null
            };
        }

        if (peekLineTerminator()) {
            if (!state.inIteration) {
                throwError({}, Messages.IllegalContinue);
            }

            return {
                type: Syntax.ContinueStatement,
                label: null
            };
        }

        token = lookahead();
        if (token.type === Token.Identifier) {
            label = parseVariableIdentifier();

            if (!Object.prototype.hasOwnProperty.call(state.labelSet, label.name)) {
                throwError({}, Messages.UnknownLabel, label.name);
            }
        }

        consumeSemicolon();

        if (label === null && !state.inIteration) {
            throwError({}, Messages.IllegalContinue);
        }

        return {
            type: Syntax.ContinueStatement,
            label: label
        };
    }

    // 12.8 The break statement

    function parseBreakStatement() {
        var token, label = null;

        expectKeyword('break');

        // Optimize the most common form: 'break;'.
        if (source[index] === ';') {
            lex();

            if (!(state.inIteration || state.inSwitch)) {
                throwError({}, Messages.IllegalBreak);
            }

            return {
                type: Syntax.BreakStatement,
                label: null
            };
        }

        if (peekLineTerminator()) {
            if (!(state.inIteration || state.inSwitch)) {
                throwError({}, Messages.IllegalBreak);
            }

            return {
                type: Syntax.BreakStatement,
                label: null
            };
        }

        token = lookahead();
        if (token.type === Token.Identifier) {
            label = parseVariableIdentifier();

            if (!Object.prototype.hasOwnProperty.call(state.labelSet, label.name)) {
                throwError({}, Messages.UnknownLabel, label.name);
            }
        }

        consumeSemicolon();

        if (label === null && !(state.inIteration || state.inSwitch)) {
            throwError({}, Messages.IllegalBreak);
        }

        return {
            type: Syntax.BreakStatement,
            label: label
        };
    }

    // 12.9 The return statement

    function parseReturnStatement() {
        var token, argument = null;

        expectKeyword('return');

        if (!state.inFunctionBody) {
            throwErrorTolerant({}, Messages.IllegalReturn);
        }

        // 'return' followed by a space and an identifier is very common.
        if (source[index] === ' ') {
            if (isIdentifierStart(source[index + 1])) {
                argument = parseExpression();
                consumeSemicolon();
                return {
                    type: Syntax.ReturnStatement,
                    argument: argument
                };
            }
        }

        if (peekLineTerminator()) {
            return {
                type: Syntax.ReturnStatement,
                argument: null
            };
        }

        if (!match(';')) {
            token = lookahead();
            if (!match('}') && token.type !== Token.EOF) {
                argument = parseExpression();
            }
        }

        consumeSemicolon();

        return {
            type: Syntax.ReturnStatement,
            argument: argument
        };
    }

    // 12.10 The with statement

    function parseWithStatement() {
        var object, body;

        if (strict) {
            throwErrorTolerant({}, Messages.StrictModeWith);
        }

        expectKeyword('with');

        expect('(');

        object = parseExpression();

        expect(')');

        body = parseStatement();

        return {
            type: Syntax.WithStatement,
            object: object,
            body: body
        };
    }

    // 12.10 The swith statement

    function parseSwitchCase() {
        var test,
            consequent = [],
            statement;

        if (matchKeyword('default')) {
            lex();
            test = null;
        } else {
            expectKeyword('case');
            test = parseExpression();
        }
        expect(':');

        while (index < length) {
            if (match('}') || matchKeyword('default') || matchKeyword('case')) {
                break;
            }
            statement = parseStatement();
            if (typeof statement === 'undefined') {
                break;
            }
            consequent.push(statement);
        }

        return {
            type: Syntax.SwitchCase,
            test: test,
            consequent: consequent
        };
    }

    function parseSwitchStatement() {
        var discriminant, cases, clause, oldInSwitch, defaultFound;

        expectKeyword('switch');

        expect('(');

        discriminant = parseExpression();

        expect(')');

        expect('{');

        if (match('}')) {
            lex();
            return {
                type: Syntax.SwitchStatement,
                discriminant: discriminant
            };
        }

        cases = [];

        oldInSwitch = state.inSwitch;
        state.inSwitch = true;
        defaultFound = false;

        while (index < length) {
            if (match('}')) {
                break;
            }
            clause = parseSwitchCase();
            if (clause.test === null) {
                if (defaultFound) {
                    throwError({}, Messages.MultipleDefaultsInSwitch);
                }
                defaultFound = true;
            }
            cases.push(clause);
        }

        state.inSwitch = oldInSwitch;

        expect('}');

        return {
            type: Syntax.SwitchStatement,
            discriminant: discriminant,
            cases: cases
        };
    }

    // 12.13 The throw statement

    function parseThrowStatement() {
        var argument;

        expectKeyword('throw');

        if (peekLineTerminator()) {
            throwError({}, Messages.NewlineAfterThrow);
        }

        argument = parseExpression();

        consumeSemicolon();

        return {
            type: Syntax.ThrowStatement,
            argument: argument
        };
    }

    // 12.14 The try statement

    function parseCatchClause() {
        var param;

        expectKeyword('catch');

        expect('(');
        if (match(')')) {
            throwUnexpected(lookahead());
        }

        param = parseVariableIdentifier();
        // 12.14.1
        if (strict && isRestrictedWord(param.name)) {
            throwErrorTolerant({}, Messages.StrictCatchVariable);
        }

        expect(')');

        return {
            type: Syntax.CatchClause,
            param: param,
            body: parseBlock()
        };
    }

    function parseTryStatement() {
        var block, handlers = [], finalizer = null;

        expectKeyword('try');

        block = parseBlock();

        if (matchKeyword('catch')) {
            handlers.push(parseCatchClause());
        }

        if (matchKeyword('finally')) {
            lex();
            finalizer = parseBlock();
        }

        if (handlers.length === 0 && !finalizer) {
            throwError({}, Messages.NoCatchOrFinally);
        }

        return {
            type: Syntax.TryStatement,
            block: block,
            guardedHandlers: [],
            handlers: handlers,
            finalizer: finalizer
        };
    }

    // 12.15 The debugger statement

    function parseDebuggerStatement() {
        expectKeyword('debugger');

        consumeSemicolon();

        return {
            type: Syntax.DebuggerStatement
        };
    }

    // 12 Statements

    function parseStatement() {
        var token = lookahead(),
            expr,
            labeledBody;

        if (token.type === Token.EOF) {
            throwUnexpected(token);
        }

        if (token.type === Token.Punctuator) {
            switch (token.value) {
            case ';':
                return parseEmptyStatement();
            case '{':
                return parseBlock();
            case '(':
                return parseExpressionStatement();
            default:
                break;
            }
        }

        if (token.type === Token.Keyword) {
            switch (token.value) {
            case 'break':
                return parseBreakStatement();
            case 'continue':
                return parseContinueStatement();
            case 'debugger':
                return parseDebuggerStatement();
            case 'do':
                return parseDoWhileStatement();
            case 'for':
                return parseForStatement();
            case 'function':
                return parseFunctionDeclaration();
            case 'if':
                return parseIfStatement();
            case 'return':
                return parseReturnStatement();
            case 'switch':
                return parseSwitchStatement();
            case 'throw':
                return parseThrowStatement();
            case 'try':
                return parseTryStatement();
            case 'var':
                return parseVariableStatement();
            case 'while':
                return parseWhileStatement();
            case 'with':
                return parseWithStatement();
            default:
                break;
            }
        }

        expr = parseExpression();

        // 12.12 Labelled Statements
        if ((expr.type === Syntax.Identifier) && match(':')) {
            lex();

            if (Object.prototype.hasOwnProperty.call(state.labelSet, expr.name)) {
                throwError({}, Messages.Redeclaration, 'Label', expr.name);
            }

            state.labelSet[expr.name] = true;
            labeledBody = parseStatement();
            delete state.labelSet[expr.name];

            return {
                type: Syntax.LabeledStatement,
                label: expr,
                body: labeledBody
            };
        }

        consumeSemicolon();

        return {
            type: Syntax.ExpressionStatement,
            expression: expr
        };
    }

    // 13 Function Definition

    function parseFunctionSourceElements() {
        var sourceElement, sourceElements = [], token, directive, firstRestricted,
            oldLabelSet, oldInIteration, oldInSwitch, oldInFunctionBody;

        expect('{');

        while (index < length) {
            token = lookahead();
            if (token.type !== Token.StringLiteral) {
                break;
            }

            sourceElement = parseSourceElement();
            sourceElements.push(sourceElement);
            if (sourceElement.expression.type !== Syntax.Literal) {
                // this is not directive
                break;
            }
            directive = sliceSource(token.range[0] + 1, token.range[1] - 1);
            if (directive === 'use strict') {
                strict = true;
                if (firstRestricted) {
                    throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
                }
            } else {
                if (!firstRestricted && token.octal) {
                    firstRestricted = token;
                }
            }
        }

        oldLabelSet = state.labelSet;
        oldInIteration = state.inIteration;
        oldInSwitch = state.inSwitch;
        oldInFunctionBody = state.inFunctionBody;

        state.labelSet = {};
        state.inIteration = false;
        state.inSwitch = false;
        state.inFunctionBody = true;

        while (index < length) {
            if (match('}')) {
                break;
            }
            sourceElement = parseSourceElement();
            if (typeof sourceElement === 'undefined') {
                break;
            }
            sourceElements.push(sourceElement);
        }

        expect('}');

        state.labelSet = oldLabelSet;
        state.inIteration = oldInIteration;
        state.inSwitch = oldInSwitch;
        state.inFunctionBody = oldInFunctionBody;

        return {
            type: Syntax.BlockStatement,
            body: sourceElements
        };
    }

    function parseFunctionDeclaration() {
        var id, param, params = [], body, token, stricted, firstRestricted, message, previousStrict, paramSet;

        expectKeyword('function');
        token = lookahead();
        id = parseVariableIdentifier();
        if (strict) {
            if (isRestrictedWord(token.value)) {
                throwErrorTolerant(token, Messages.StrictFunctionName);
            }
        } else {
            if (isRestrictedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictFunctionName;
            } else if (isStrictModeReservedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictReservedWord;
            }
        }

        expect('(');

        if (!match(')')) {
            paramSet = {};
            while (index < length) {
                token = lookahead();
                param = parseVariableIdentifier();
                if (strict) {
                    if (isRestrictedWord(token.value)) {
                        stricted = token;
                        message = Messages.StrictParamName;
                    }
                    if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                        stricted = token;
                        message = Messages.StrictParamDupe;
                    }
                } else if (!firstRestricted) {
                    if (isRestrictedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictParamName;
                    } else if (isStrictModeReservedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictReservedWord;
                    } else if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictParamDupe;
                    }
                }
                params.push(param);
                paramSet[param.name] = true;
                if (match(')')) {
                    break;
                }
                expect(',');
            }
        }

        expect(')');

        previousStrict = strict;
        body = parseFunctionSourceElements();
        if (strict && firstRestricted) {
            throwError(firstRestricted, message);
        }
        if (strict && stricted) {
            throwErrorTolerant(stricted, message);
        }
        strict = previousStrict;

        return {
            type: Syntax.FunctionDeclaration,
            id: id,
            params: params,
            defaults: [],
            body: body,
            rest: null,
            generator: false,
            expression: false
        };
    }

    function parseFunctionExpression() {
        var token, id = null, stricted, firstRestricted, message, param, params = [], body, previousStrict, paramSet;

        expectKeyword('function');

        if (!match('(')) {
            token = lookahead();
            id = parseVariableIdentifier();
            if (strict) {
                if (isRestrictedWord(token.value)) {
                    throwErrorTolerant(token, Messages.StrictFunctionName);
                }
            } else {
                if (isRestrictedWord(token.value)) {
                    firstRestricted = token;
                    message = Messages.StrictFunctionName;
                } else if (isStrictModeReservedWord(token.value)) {
                    firstRestricted = token;
                    message = Messages.StrictReservedWord;
                }
            }
        }

        expect('(');

        if (!match(')')) {
            paramSet = {};
            while (index < length) {
                token = lookahead();
                param = parseVariableIdentifier();
                if (strict) {
                    if (isRestrictedWord(token.value)) {
                        stricted = token;
                        message = Messages.StrictParamName;
                    }
                    if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                        stricted = token;
                        message = Messages.StrictParamDupe;
                    }
                } else if (!firstRestricted) {
                    if (isRestrictedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictParamName;
                    } else if (isStrictModeReservedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictReservedWord;
                    } else if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictParamDupe;
                    }
                }
                params.push(param);
                paramSet[param.name] = true;
                if (match(')')) {
                    break;
                }
                expect(',');
            }
        }

        expect(')');

        previousStrict = strict;
        body = parseFunctionSourceElements();
        if (strict && firstRestricted) {
            throwError(firstRestricted, message);
        }
        if (strict && stricted) {
            throwErrorTolerant(stricted, message);
        }
        strict = previousStrict;

        return {
            type: Syntax.FunctionExpression,
            id: id,
            params: params,
            defaults: [],
            body: body,
            rest: null,
            generator: false,
            expression: false
        };
    }

    // 14 Program

    function parseSourceElement() {
        var token = lookahead();

        if (token.type === Token.Keyword) {
            switch (token.value) {
            case 'const':
            case 'let':
                return parseConstLetDeclaration(token.value);
            case 'function':
                return parseFunctionDeclaration();
            default:
                return parseStatement();
            }
        }

        if (token.type !== Token.EOF) {
            return parseStatement();
        }
    }

    function parseSourceElements() {
        var sourceElement, sourceElements = [], token, directive, firstRestricted;

        while (index < length) {
            token = lookahead();
            if (token.type !== Token.StringLiteral) {
                break;
            }

            sourceElement = parseSourceElement();
            sourceElements.push(sourceElement);
            if (sourceElement.expression.type !== Syntax.Literal) {
                // this is not directive
                break;
            }
            directive = sliceSource(token.range[0] + 1, token.range[1] - 1);
            if (directive === 'use strict') {
                strict = true;
                if (firstRestricted) {
                    throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
                }
            } else {
                if (!firstRestricted && token.octal) {
                    firstRestricted = token;
                }
            }
        }

        while (index < length) {
            sourceElement = parseSourceElement();
            if (typeof sourceElement === 'undefined') {
                break;
            }
            sourceElements.push(sourceElement);
        }
        return sourceElements;
    }

    function parseProgram() {
        var program;
        strict = false;
        program = {
            type: Syntax.Program,
            body: parseSourceElements()
        };
        return program;
    }

    // The following functions are needed only when the option to preserve
    // the comments is active.

    function addComment(type, value, start, end, loc) {
        assert(typeof start === 'number', 'Comment must have valid position');

        // Because the way the actual token is scanned, often the comments
        // (if any) are skipped twice during the lexical analysis.
        // Thus, we need to skip adding a comment if the comment array already
        // handled it.
        if (extra.comments.length > 0) {
            if (extra.comments[extra.comments.length - 1].range[1] > start) {
                return;
            }
        }

        extra.comments.push({
            type: type,
            value: value,
            range: [start, end],
            loc: loc
        });
    }

    function scanComment() {
        var comment, ch, loc, start, blockComment, lineComment;

        comment = '';
        blockComment = false;
        lineComment = false;

        while (index < length) {
            ch = source[index];

            if (lineComment) {
                ch = source[index++];
                if (isLineTerminator(ch)) {
                    loc.end = {
                        line: lineNumber,
                        column: index - lineStart - 1
                    };
                    lineComment = false;
                    addComment('Line', comment, start, index - 1, loc);
                    if (ch === '\r' && source[index] === '\n') {
                        ++index;
                    }
                    ++lineNumber;
                    lineStart = index;
                    comment = '';
                } else if (index >= length) {
                    lineComment = false;
                    comment += ch;
                    loc.end = {
                        line: lineNumber,
                        column: length - lineStart
                    };
                    addComment('Line', comment, start, length, loc);
                } else {
                    comment += ch;
                }
            } else if (blockComment) {
                if (isLineTerminator(ch)) {
                    if (ch === '\r' && source[index + 1] === '\n') {
                        ++index;
                        comment += '\r\n';
                    } else {
                        comment += ch;
                    }
                    ++lineNumber;
                    ++index;
                    lineStart = index;
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    ch = source[index++];
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                    comment += ch;
                    if (ch === '*') {
                        ch = source[index];
                        if (ch === '/') {
                            comment = comment.substr(0, comment.length - 1);
                            blockComment = false;
                            ++index;
                            loc.end = {
                                line: lineNumber,
                                column: index - lineStart
                            };
                            addComment('Block', comment, start, index, loc);
                            comment = '';
                        }
                    }
                }
            } else if (ch === '/') {
                ch = source[index + 1];
                if (ch === '/') {
                    loc = {
                        start: {
                            line: lineNumber,
                            column: index - lineStart
                        }
                    };
                    start = index;
                    index += 2;
                    lineComment = true;
                    if (index >= length) {
                        loc.end = {
                            line: lineNumber,
                            column: index - lineStart
                        };
                        lineComment = false;
                        addComment('Line', comment, start, index, loc);
                    }
                } else if (ch === '*') {
                    start = index;
                    index += 2;
                    blockComment = true;
                    loc = {
                        start: {
                            line: lineNumber,
                            column: index - lineStart - 2
                        }
                    };
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    break;
                }
            } else if (isWhiteSpace(ch)) {
                ++index;
            } else if (isLineTerminator(ch)) {
                ++index;
                if (ch ===  '\r' && source[index] === '\n') {
                    ++index;
                }
                ++lineNumber;
                lineStart = index;
            } else {
                break;
            }
        }
    }

    function filterCommentLocation() {
        var i, entry, comment, comments = [];

        for (i = 0; i < extra.comments.length; ++i) {
            entry = extra.comments[i];
            comment = {
                type: entry.type,
                value: entry.value
            };
            if (extra.range) {
                comment.range = entry.range;
            }
            if (extra.loc) {
                comment.loc = entry.loc;
            }
            comments.push(comment);
        }

        extra.comments = comments;
    }

    function collectToken() {
        var start, loc, token, range, value;

        skipComment();
        start = index;
        loc = {
            start: {
                line: lineNumber,
                column: index - lineStart
            }
        };

        token = extra.advance();
        loc.end = {
            line: lineNumber,
            column: index - lineStart
        };

        if (token.type !== Token.EOF) {
            range = [token.range[0], token.range[1]];
            value = sliceSource(token.range[0], token.range[1]);
            extra.tokens.push({
                type: TokenName[token.type],
                value: value,
                range: range,
                loc: loc
            });
        }

        return token;
    }

    function collectRegex() {
        var pos, loc, regex, token;

        skipComment();

        pos = index;
        loc = {
            start: {
                line: lineNumber,
                column: index - lineStart
            }
        };

        regex = extra.scanRegExp();
        loc.end = {
            line: lineNumber,
            column: index - lineStart
        };

        // Pop the previous token, which is likely '/' or '/='
        if (extra.tokens.length > 0) {
            token = extra.tokens[extra.tokens.length - 1];
            if (token.range[0] === pos && token.type === 'Punctuator') {
                if (token.value === '/' || token.value === '/=') {
                    extra.tokens.pop();
                }
            }
        }

        extra.tokens.push({
            type: 'RegularExpression',
            value: regex.literal,
            range: [pos, index],
            loc: loc
        });

        return regex;
    }

    function filterTokenLocation() {
        var i, entry, token, tokens = [];

        for (i = 0; i < extra.tokens.length; ++i) {
            entry = extra.tokens[i];
            token = {
                type: entry.type,
                value: entry.value
            };
            if (extra.range) {
                token.range = entry.range;
            }
            if (extra.loc) {
                token.loc = entry.loc;
            }
            tokens.push(token);
        }

        extra.tokens = tokens;
    }

    function createLiteral(token) {
        return {
            type: Syntax.Literal,
            value: token.value
        };
    }

    function createRawLiteral(token) {
        return {
            type: Syntax.Literal,
            value: token.value,
            raw: sliceSource(token.range[0], token.range[1])
        };
    }

    function createLocationMarker() {
        var marker = {};

        marker.range = [index, index];
        marker.loc = {
            start: {
                line: lineNumber,
                column: index - lineStart
            },
            end: {
                line: lineNumber,
                column: index - lineStart
            }
        };

        marker.end = function () {
            this.range[1] = index;
            this.loc.end.line = lineNumber;
            this.loc.end.column = index - lineStart;
        };

        marker.applyGroup = function (node) {
            if (extra.range) {
                node.groupRange = [this.range[0], this.range[1]];
            }
            if (extra.loc) {
                node.groupLoc = {
                    start: {
                        line: this.loc.start.line,
                        column: this.loc.start.column
                    },
                    end: {
                        line: this.loc.end.line,
                        column: this.loc.end.column
                    }
                };
            }
        };

        marker.apply = function (node) {
            if (extra.range) {
                node.range = [this.range[0], this.range[1]];
            }
            if (extra.loc) {
                node.loc = {
                    start: {
                        line: this.loc.start.line,
                        column: this.loc.start.column
                    },
                    end: {
                        line: this.loc.end.line,
                        column: this.loc.end.column
                    }
                };
            }
        };

        return marker;
    }

    function trackGroupExpression() {
        var marker, expr;

        skipComment();
        marker = createLocationMarker();
        expect('(');

        expr = parseExpression();

        expect(')');

        marker.end();
        marker.applyGroup(expr);

        return expr;
    }

    function trackLeftHandSideExpression() {
        var marker, expr;

        skipComment();
        marker = createLocationMarker();

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[')) {
            if (match('[')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: true,
                    object: expr,
                    property: parseComputedMember()
                };
                marker.end();
                marker.apply(expr);
            } else {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: false,
                    object: expr,
                    property: parseNonComputedMember()
                };
                marker.end();
                marker.apply(expr);
            }
        }

        return expr;
    }

    function trackLeftHandSideExpressionAllowCall() {
        var marker, expr;

        skipComment();
        marker = createLocationMarker();

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[') || match('(')) {
            if (match('(')) {
                expr = {
                    type: Syntax.CallExpression,
                    callee: expr,
                    'arguments': parseArguments()
                };
                marker.end();
                marker.apply(expr);
            } else if (match('[')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: true,
                    object: expr,
                    property: parseComputedMember()
                };
                marker.end();
                marker.apply(expr);
            } else {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: false,
                    object: expr,
                    property: parseNonComputedMember()
                };
                marker.end();
                marker.apply(expr);
            }
        }

        return expr;
    }

    function filterGroup(node) {
        var n, i, entry;

        n = (Object.prototype.toString.apply(node) === '[object Array]') ? [] : {};
        for (i in node) {
            if (node.hasOwnProperty(i) && i !== 'groupRange' && i !== 'groupLoc') {
                entry = node[i];
                if (entry === null || typeof entry !== 'object' || entry instanceof RegExp) {
                    n[i] = entry;
                } else {
                    n[i] = filterGroup(entry);
                }
            }
        }
        return n;
    }

    function wrapTrackingFunction(range, loc) {

        return function (parseFunction) {

            function isBinary(node) {
                return node.type === Syntax.LogicalExpression ||
                    node.type === Syntax.BinaryExpression;
            }

            function visit(node) {
                var start, end;

                if (isBinary(node.left)) {
                    visit(node.left);
                }
                if (isBinary(node.right)) {
                    visit(node.right);
                }

                if (range) {
                    if (node.left.groupRange || node.right.groupRange) {
                        start = node.left.groupRange ? node.left.groupRange[0] : node.left.range[0];
                        end = node.right.groupRange ? node.right.groupRange[1] : node.right.range[1];
                        node.range = [start, end];
                    } else if (typeof node.range === 'undefined') {
                        start = node.left.range[0];
                        end = node.right.range[1];
                        node.range = [start, end];
                    }
                }
                if (loc) {
                    if (node.left.groupLoc || node.right.groupLoc) {
                        start = node.left.groupLoc ? node.left.groupLoc.start : node.left.loc.start;
                        end = node.right.groupLoc ? node.right.groupLoc.end : node.right.loc.end;
                        node.loc = {
                            start: start,
                            end: end
                        };
                    } else if (typeof node.loc === 'undefined') {
                        node.loc = {
                            start: node.left.loc.start,
                            end: node.right.loc.end
                        };
                    }
                }
            }

            return function () {
                var marker, node;

                skipComment();

                marker = createLocationMarker();
                node = parseFunction.apply(null, arguments);
                marker.end();

                if (range && typeof node.range === 'undefined') {
                    marker.apply(node);
                }

                if (loc && typeof node.loc === 'undefined') {
                    marker.apply(node);
                }

                if (isBinary(node)) {
                    visit(node);
                }

                return node;
            };
        };
    }

    function patch() {

        var wrapTracking;

        if (extra.comments) {
            extra.skipComment = skipComment;
            skipComment = scanComment;
        }

        if (extra.raw) {
            extra.createLiteral = createLiteral;
            createLiteral = createRawLiteral;
        }

        if (extra.range || extra.loc) {

            extra.parseGroupExpression = parseGroupExpression;
            extra.parseLeftHandSideExpression = parseLeftHandSideExpression;
            extra.parseLeftHandSideExpressionAllowCall = parseLeftHandSideExpressionAllowCall;
            parseGroupExpression = trackGroupExpression;
            parseLeftHandSideExpression = trackLeftHandSideExpression;
            parseLeftHandSideExpressionAllowCall = trackLeftHandSideExpressionAllowCall;

            wrapTracking = wrapTrackingFunction(extra.range, extra.loc);

            extra.parseAdditiveExpression = parseAdditiveExpression;
            extra.parseAssignmentExpression = parseAssignmentExpression;
            extra.parseBitwiseANDExpression = parseBitwiseANDExpression;
            extra.parseBitwiseORExpression = parseBitwiseORExpression;
            extra.parseBitwiseXORExpression = parseBitwiseXORExpression;
            extra.parseBlock = parseBlock;
            extra.parseFunctionSourceElements = parseFunctionSourceElements;
            extra.parseCatchClause = parseCatchClause;
            extra.parseComputedMember = parseComputedMember;
            extra.parseConditionalExpression = parseConditionalExpression;
            extra.parseConstLetDeclaration = parseConstLetDeclaration;
            extra.parseEqualityExpression = parseEqualityExpression;
            extra.parseExpression = parseExpression;
            extra.parseForVariableDeclaration = parseForVariableDeclaration;
            extra.parseFunctionDeclaration = parseFunctionDeclaration;
            extra.parseFunctionExpression = parseFunctionExpression;
            extra.parseLogicalANDExpression = parseLogicalANDExpression;
            extra.parseLogicalORExpression = parseLogicalORExpression;
            extra.parseMultiplicativeExpression = parseMultiplicativeExpression;
            extra.parseNewExpression = parseNewExpression;
            extra.parseNonComputedProperty = parseNonComputedProperty;
            extra.parseObjectProperty = parseObjectProperty;
            extra.parseObjectPropertyKey = parseObjectPropertyKey;
            extra.parsePostfixExpression = parsePostfixExpression;
            extra.parsePrimaryExpression = parsePrimaryExpression;
            extra.parseProgram = parseProgram;
            extra.parsePropertyFunction = parsePropertyFunction;
            extra.parseRelationalExpression = parseRelationalExpression;
            extra.parseStatement = parseStatement;
            extra.parseShiftExpression = parseShiftExpression;
            extra.parseSwitchCase = parseSwitchCase;
            extra.parseUnaryExpression = parseUnaryExpression;
            extra.parseVariableDeclaration = parseVariableDeclaration;
            extra.parseVariableIdentifier = parseVariableIdentifier;

            parseAdditiveExpression = wrapTracking(extra.parseAdditiveExpression);
            parseAssignmentExpression = wrapTracking(extra.parseAssignmentExpression);
            parseBitwiseANDExpression = wrapTracking(extra.parseBitwiseANDExpression);
            parseBitwiseORExpression = wrapTracking(extra.parseBitwiseORExpression);
            parseBitwiseXORExpression = wrapTracking(extra.parseBitwiseXORExpression);
            parseBlock = wrapTracking(extra.parseBlock);
            parseFunctionSourceElements = wrapTracking(extra.parseFunctionSourceElements);
            parseCatchClause = wrapTracking(extra.parseCatchClause);
            parseComputedMember = wrapTracking(extra.parseComputedMember);
            parseConditionalExpression = wrapTracking(extra.parseConditionalExpression);
            parseConstLetDeclaration = wrapTracking(extra.parseConstLetDeclaration);
            parseEqualityExpression = wrapTracking(extra.parseEqualityExpression);
            parseExpression = wrapTracking(extra.parseExpression);
            parseForVariableDeclaration = wrapTracking(extra.parseForVariableDeclaration);
            parseFunctionDeclaration = wrapTracking(extra.parseFunctionDeclaration);
            parseFunctionExpression = wrapTracking(extra.parseFunctionExpression);
            parseLeftHandSideExpression = wrapTracking(parseLeftHandSideExpression);
            parseLogicalANDExpression = wrapTracking(extra.parseLogicalANDExpression);
            parseLogicalORExpression = wrapTracking(extra.parseLogicalORExpression);
            parseMultiplicativeExpression = wrapTracking(extra.parseMultiplicativeExpression);
            parseNewExpression = wrapTracking(extra.parseNewExpression);
            parseNonComputedProperty = wrapTracking(extra.parseNonComputedProperty);
            parseObjectProperty = wrapTracking(extra.parseObjectProperty);
            parseObjectPropertyKey = wrapTracking(extra.parseObjectPropertyKey);
            parsePostfixExpression = wrapTracking(extra.parsePostfixExpression);
            parsePrimaryExpression = wrapTracking(extra.parsePrimaryExpression);
            parseProgram = wrapTracking(extra.parseProgram);
            parsePropertyFunction = wrapTracking(extra.parsePropertyFunction);
            parseRelationalExpression = wrapTracking(extra.parseRelationalExpression);
            parseStatement = wrapTracking(extra.parseStatement);
            parseShiftExpression = wrapTracking(extra.parseShiftExpression);
            parseSwitchCase = wrapTracking(extra.parseSwitchCase);
            parseUnaryExpression = wrapTracking(extra.parseUnaryExpression);
            parseVariableDeclaration = wrapTracking(extra.parseVariableDeclaration);
            parseVariableIdentifier = wrapTracking(extra.parseVariableIdentifier);
        }

        if (typeof extra.tokens !== 'undefined') {
            extra.advance = advance;
            extra.scanRegExp = scanRegExp;

            advance = collectToken;
            scanRegExp = collectRegex;
        }
    }

    function unpatch() {
        if (typeof extra.skipComment === 'function') {
            skipComment = extra.skipComment;
        }

        if (extra.raw) {
            createLiteral = extra.createLiteral;
        }

        if (extra.range || extra.loc) {
            parseAdditiveExpression = extra.parseAdditiveExpression;
            parseAssignmentExpression = extra.parseAssignmentExpression;
            parseBitwiseANDExpression = extra.parseBitwiseANDExpression;
            parseBitwiseORExpression = extra.parseBitwiseORExpression;
            parseBitwiseXORExpression = extra.parseBitwiseXORExpression;
            parseBlock = extra.parseBlock;
            parseFunctionSourceElements = extra.parseFunctionSourceElements;
            parseCatchClause = extra.parseCatchClause;
            parseComputedMember = extra.parseComputedMember;
            parseConditionalExpression = extra.parseConditionalExpression;
            parseConstLetDeclaration = extra.parseConstLetDeclaration;
            parseEqualityExpression = extra.parseEqualityExpression;
            parseExpression = extra.parseExpression;
            parseForVariableDeclaration = extra.parseForVariableDeclaration;
            parseFunctionDeclaration = extra.parseFunctionDeclaration;
            parseFunctionExpression = extra.parseFunctionExpression;
            parseGroupExpression = extra.parseGroupExpression;
            parseLeftHandSideExpression = extra.parseLeftHandSideExpression;
            parseLeftHandSideExpressionAllowCall = extra.parseLeftHandSideExpressionAllowCall;
            parseLogicalANDExpression = extra.parseLogicalANDExpression;
            parseLogicalORExpression = extra.parseLogicalORExpression;
            parseMultiplicativeExpression = extra.parseMultiplicativeExpression;
            parseNewExpression = extra.parseNewExpression;
            parseNonComputedProperty = extra.parseNonComputedProperty;
            parseObjectProperty = extra.parseObjectProperty;
            parseObjectPropertyKey = extra.parseObjectPropertyKey;
            parsePrimaryExpression = extra.parsePrimaryExpression;
            parsePostfixExpression = extra.parsePostfixExpression;
            parseProgram = extra.parseProgram;
            parsePropertyFunction = extra.parsePropertyFunction;
            parseRelationalExpression = extra.parseRelationalExpression;
            parseStatement = extra.parseStatement;
            parseShiftExpression = extra.parseShiftExpression;
            parseSwitchCase = extra.parseSwitchCase;
            parseUnaryExpression = extra.parseUnaryExpression;
            parseVariableDeclaration = extra.parseVariableDeclaration;
            parseVariableIdentifier = extra.parseVariableIdentifier;
        }

        if (typeof extra.scanRegExp === 'function') {
            advance = extra.advance;
            scanRegExp = extra.scanRegExp;
        }
    }

    function stringToArray(str) {
        var length = str.length,
            result = [],
            i;
        for (i = 0; i < length; ++i) {
            result[i] = str.charAt(i);
        }
        return result;
    }

    function parse(code, options) {
        var program, toString;

        toString = String;
        if (typeof code !== 'string' && !(code instanceof String)) {
            code = toString(code);
        }

        source = code;
        index = 0;
        lineNumber = (source.length > 0) ? 1 : 0;
        lineStart = 0;
        length = source.length;
        buffer = null;
        state = {
            allowIn: true,
            labelSet: {},
            inFunctionBody: false,
            inIteration: false,
            inSwitch: false
        };

        extra = {};
        if (typeof options !== 'undefined') {
            extra.range = (typeof options.range === 'boolean') && options.range;
            extra.loc = (typeof options.loc === 'boolean') && options.loc;
            extra.raw = (typeof options.raw === 'boolean') && options.raw;
            if (typeof options.tokens === 'boolean' && options.tokens) {
                extra.tokens = [];
            }
            if (typeof options.comment === 'boolean' && options.comment) {
                extra.comments = [];
            }
            if (typeof options.tolerant === 'boolean' && options.tolerant) {
                extra.errors = [];
            }
        }

        if (length > 0) {
            if (typeof source[0] === 'undefined') {
                // Try first to convert to a string. This is good as fast path
                // for old IE which understands string indexing for string
                // literals only and not for string object.
                if (code instanceof String) {
                    source = code.valueOf();
                }

                // Force accessing the characters via an array.
                if (typeof source[0] === 'undefined') {
                    source = stringToArray(code);
                }
            }
        }

        patch();
        try {
            program = parseProgram();
            if (typeof extra.comments !== 'undefined') {
                filterCommentLocation();
                program.comments = extra.comments;
            }
            if (typeof extra.tokens !== 'undefined') {
                filterTokenLocation();
                program.tokens = extra.tokens;
            }
            if (typeof extra.errors !== 'undefined') {
                program.errors = extra.errors;
            }
            if (extra.range || extra.loc) {
                program.body = filterGroup(program.body);
            }
        } catch (e) {
            throw e;
        } finally {
            unpatch();
            extra = {};
        }

        return program;
    }

    // Sync with package.json.
    exports.version = '1.0.3';

    exports.parse = parse;

    // Deep copy.
    exports.Syntax = (function () {
        var name, types = {};

        if (typeof Object.create === 'function') {
            types = Object.create(null);
        }

        for (name in Syntax) {
            if (Syntax.hasOwnProperty(name)) {
                types[name] = Syntax[name];
            }
        }

        if (typeof Object.freeze === 'function') {
            Object.freeze(types);
        }

        return types;
    }());

}));
/* vim: set sw=4 ts=4 et tw=80 : */

},{}],4:[function(require,module,exports){
/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
  Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global exports:true, define:true, window:true */
(function (factory) {
    'use strict';

    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
    // and plain browser loading,
    if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
    } else if (typeof exports !== 'undefined') {
        factory(exports);
    } else {
        factory((window.estraverse = {}));
    }
}(function (exports) {
    'use strict';

    var Syntax,
        isArray,
        VisitorOption,
        VisitorKeys,
        wrappers;

    Syntax = {
        AssignmentExpression: 'AssignmentExpression',
        ArrayExpression: 'ArrayExpression',
        BlockStatement: 'BlockStatement',
        BinaryExpression: 'BinaryExpression',
        BreakStatement: 'BreakStatement',
        CallExpression: 'CallExpression',
        CatchClause: 'CatchClause',
        ConditionalExpression: 'ConditionalExpression',
        ContinueStatement: 'ContinueStatement',
        DebuggerStatement: 'DebuggerStatement',
        DirectiveStatement: 'DirectiveStatement',
        DoWhileStatement: 'DoWhileStatement',
        EmptyStatement: 'EmptyStatement',
        ExpressionStatement: 'ExpressionStatement',
        ForStatement: 'ForStatement',
        ForInStatement: 'ForInStatement',
        FunctionDeclaration: 'FunctionDeclaration',
        FunctionExpression: 'FunctionExpression',
        Identifier: 'Identifier',
        IfStatement: 'IfStatement',
        Literal: 'Literal',
        LabeledStatement: 'LabeledStatement',
        LogicalExpression: 'LogicalExpression',
        MemberExpression: 'MemberExpression',
        NewExpression: 'NewExpression',
        ObjectExpression: 'ObjectExpression',
        Program: 'Program',
        Property: 'Property',
        ReturnStatement: 'ReturnStatement',
        SequenceExpression: 'SequenceExpression',
        SwitchStatement: 'SwitchStatement',
        SwitchCase: 'SwitchCase',
        ThisExpression: 'ThisExpression',
        ThrowStatement: 'ThrowStatement',
        TryStatement: 'TryStatement',
        UnaryExpression: 'UnaryExpression',
        UpdateExpression: 'UpdateExpression',
        VariableDeclaration: 'VariableDeclaration',
        VariableDeclarator: 'VariableDeclarator',
        WhileStatement: 'WhileStatement',
        WithStatement: 'WithStatement'
    };

    isArray = Array.isArray;
    if (!isArray) {
        isArray = function isArray(array) {
            return Object.prototype.toString.call(array) === '[object Array]';
        };
    }

    VisitorKeys = {
        AssignmentExpression: ['left', 'right'],
        ArrayExpression: ['elements'],
        BlockStatement: ['body'],
        BinaryExpression: ['left', 'right'],
        BreakStatement: ['label'],
        CallExpression: ['callee', 'arguments'],
        CatchClause: ['param', 'body'],
        ConditionalExpression: ['test', 'consequent', 'alternate'],
        ContinueStatement: ['label'],
        DebuggerStatement: [],
        DirectiveStatement: [],
        DoWhileStatement: ['body', 'test'],
        EmptyStatement: [],
        ExpressionStatement: ['expression'],
        ForStatement: ['init', 'test', 'update', 'body'],
        ForInStatement: ['left', 'right', 'body'],
        FunctionDeclaration: ['id', 'params', 'body'],
        FunctionExpression: ['id', 'params', 'body'],
        Identifier: [],
        IfStatement: ['test', 'consequent', 'alternate'],
        Literal: [],
        LabeledStatement: ['label', 'body'],
        LogicalExpression: ['left', 'right'],
        MemberExpression: ['object', 'property'],
        NewExpression: ['callee', 'arguments'],
        ObjectExpression: ['properties'],
        Program: ['body'],
        Property: ['key', 'value'],
        ReturnStatement: ['argument'],
        SequenceExpression: ['expressions'],
        SwitchStatement: ['discriminant', 'cases'],
        SwitchCase: ['test', 'consequent'],
        ThisExpression: [],
        ThrowStatement: ['argument'],
        TryStatement: ['block', 'handlers', 'finalizer'],
        UnaryExpression: ['argument'],
        UpdateExpression: ['argument'],
        VariableDeclaration: ['declarations'],
        VariableDeclarator: ['id', 'init'],
        WhileStatement: ['test', 'body'],
        WithStatement: ['object', 'body']
    };

    VisitorOption = {
        Break: 1,
        Skip: 2
    };

    wrappers = {
        PropertyWrapper: 'Property'
    };

    function traverse(top, visitor) {
        var worklist, leavelist, node, nodeType, ret, current, current2, candidates, candidate, marker = {};

        worklist = [ top ];
        leavelist = [ null ];

        while (worklist.length) {
            node = worklist.pop();
            nodeType = node.type;

            if (node === marker) {
                node = leavelist.pop();
                if (visitor.leave) {
                    ret = visitor.leave(node, leavelist[leavelist.length - 1]);
                } else {
                    ret = undefined;
                }
                if (ret === VisitorOption.Break) {
                    return;
                }
            } else if (node) {
                if (wrappers.hasOwnProperty(nodeType)) {
                    node = node.node;
                    nodeType = wrappers[nodeType];
                }

                if (visitor.enter) {
                    ret = visitor.enter(node, leavelist[leavelist.length - 1]);
                } else {
                    ret = undefined;
                }

                if (ret === VisitorOption.Break) {
                    return;
                }

                worklist.push(marker);
                leavelist.push(node);

                if (ret !== VisitorOption.Skip) {
                    candidates = VisitorKeys[nodeType];
                    current = candidates.length;
                    while ((current -= 1) >= 0) {
                        candidate = node[candidates[current]];
                        if (candidate) {
                            if (isArray(candidate)) {
                                current2 = candidate.length;
                                while ((current2 -= 1) >= 0) {
                                    if (candidate[current2]) {
                                        if(nodeType === Syntax.ObjectExpression && 'properties' === candidates[current] && null == candidates[current].type) {
                                            worklist.push({type: 'PropertyWrapper', node: candidate[current2]});
                                        } else {
                                            worklist.push(candidate[current2]);
                                        }
                                    }
                                }
                            } else {
                                worklist.push(candidate);
                            }
                        }
                    }
                }
            }
        }
    }

    function replace(top, visitor) {
        var worklist, leavelist, node, nodeType, target, tuple, ret, current, current2, candidates, candidate, marker = {}, result;

        result = {
            top: top
        };

        tuple = [ top, result, 'top' ];
        worklist = [ tuple ];
        leavelist = [ tuple ];

        function notify(v) {
            ret = v;
        }

        while (worklist.length) {
            tuple = worklist.pop();

            if (tuple === marker) {
                tuple = leavelist.pop();
                ret = undefined;
                if (visitor.leave) {
                    node = tuple[0];
                    target = visitor.leave(tuple[0], leavelist[leavelist.length - 1][0], notify);
                    if (target !== undefined) {
                        node = target;
                    }
                    tuple[1][tuple[2]] = node;
                }
                if (ret === VisitorOption.Break) {
                    return result.top;
                }
            } else if (tuple[0]) {
                ret = undefined;
                node = tuple[0];

                nodeType = node.type;
                if (wrappers.hasOwnProperty(nodeType)) {
                    tuple[0] = node = node.node;
                    nodeType = wrappers[nodeType];
                }

                if (visitor.enter) {
                    target = visitor.enter(tuple[0], leavelist[leavelist.length - 1][0], notify);
                    if (target !== undefined) {
                        node = target;
                    }
                    tuple[1][tuple[2]] = node;
                    tuple[0] = node;
                }

                if (ret === VisitorOption.Break) {
                    return result.top;
                }

                if (tuple[0]) {
                    worklist.push(marker);
                    leavelist.push(tuple);

                    if (ret !== VisitorOption.Skip) {
                        candidates = VisitorKeys[nodeType];
                        current = candidates.length;
                        while ((current -= 1) >= 0) {
                            candidate = node[candidates[current]];
                            if (candidate) {
                                if (isArray(candidate)) {
                                    current2 = candidate.length;
                                    while ((current2 -= 1) >= 0) {
                                        if (candidate[current2]) {
                                            if(nodeType === Syntax.ObjectExpression && 'properties' === candidates[current] && null == candidates[current].type) {
                                                worklist.push([{type: 'PropertyWrapper', node: candidate[current2]}, candidate, current2]);
                                            } else {
                                                worklist.push([candidate[current2], candidate, current2]);
                                            }
                                        }
                                    }
                                } else {
                                    worklist.push([candidate, node, candidates[current]]);
                                }
                            }
                        }
                    }
                }
            }
        }

        return result.top;
    }

    exports.version = '0.0.4';
    exports.Syntax = Syntax;
    exports.traverse = traverse;
    exports.replace = replace;
    exports.VisitorKeys = VisitorKeys;
    exports.VisitorOption = VisitorOption;
}));
/* vim: set sw=4 ts=4 et tw=80 : */

},{}],5:[function(require,module,exports){
(function (ns) {

    var walk = require('estraverse'),
        Context = require("./../base/context.js").getContext(null),
        Syntax = walk.Syntax;

    var findParametersInProgram = function (program, contextName, param, analyzedCalls) {
        var contextStack = [new Context(program, null, {name: "global"})];
        var foundParams = [];
        analyzedCalls = analyzedCalls || {};
        //console.log("Looking for: ", contextName, param);

        var activeParam = null;
        walk.traverse(program, {
            enter: function (node) {
                var type = node.type,
                    context;
                switch (type) {
                    case Syntax.FunctionDeclaration:
                        var parentContext = contextStack[contextStack.length - 1];
                        parentContext.declareVariable(node.id.name, false);
                        context = new Context(node, parentContext, {name: node.id.name });
                        contextStack.push(context);
                        if (context.str() == contextName) {
                            if (node.params.length > param) {
                                activeParam = node.params[param].name;
                            }
                        }
                        break;
                    case Syntax.CallExpression:
                        var pos = node.arguments.reduce(function (prev, curr, index) {
                            if (curr.name == activeParam)
                                return index;
                            return prev;
                        }, -1);
                        if (pos != -1) {
                            context = contextStack[contextStack.length - 1];
                            var id = context.getVariableIdentifier(node.callee.name);
                            if (!analyzedCalls[id]) {
                                analyzedCalls[id] = true;
                                foundParams = foundParams.concat(findParametersInProgram(program, id, pos, analyzedCalls));
                            }
                        }
                        break;

                }
            },
            leave: function (node) {
                var type = node.type;
                switch (type) {
                    case Syntax.FunctionDeclaration:
                        contextStack.pop();
                        activeParam = null;
                        break;
                    case Syntax.MemberExpression:
                        if (activeParam && node.object.name == activeParam) {
                            var parameterName = node.property.name;
                            if (foundParams.indexOf(parameterName) == -1)
                                foundParams.push(parameterName);
                        }
                        break;
                }
            }
        });

        return foundParams;
    };

    /**
     * @param {object!} program
     * @param {object?} opt
     */
    ns.extractParameters = function (program, opt) {
        opt = opt || {};
        var context = opt.context || "global.shade";
        var param = opt.param || 0;

        return findParametersInProgram(program, context, param);
    };


}(exports));

},{"./../base/context.js":20,"estraverse":4}],6:[function(require,module,exports){
(function (ns) {

    var Syntax = require('estraverse').Syntax,
        VisitorOption = require('estraverse').VisitorOption,
        Shade = require("../../interfaces.js"),
        TYPES = Shade.TYPES,
        Annotation = require("./../../base/annotation.js").Annotation,
        Base = require("./../../base/index.js");


    var BinaryFunctions = {
        "+" : function(a,b) { return a + b; },
        "-" : function(a,b) { return a - b; },
        "/" : function(a,b) { return a / b; },
        "*" : function(a,b) { return a * b; },
        "%" : function(a,b) { return a % b; },

        "==" : function(a,b) { return a == b; },
        "!=" : function(a,b) { return a != b; },
        "===" : function(a,b) { return a === b; },
        "!==" : function(a,b) { return a !== b; },
        "<" : function(a,b) { return a < b; },
        "<=" : function(a,b) { return a <= b; },
        ">" : function(a,b) { return a > b; },
        ">=" : function(a,b) { return a >= b; }
        };

    var UnaryFunctions = {
                "!": function(a) { return !a; },
                "-": function(a) { return -a; },
                "+": function(a) { return +a; },
                "typeof": function(a) { return typeof a; },
                "void": function(a) { return void a; },
                "delete": function(a) { return delete a; }

    };


    function getObjectReferenceFromNode(object, context) {
        switch (object.type) {
            case Syntax.NewExpression:
            case Syntax.CallExpression:
            case Syntax.MemberExpression:
                return context.createTypeInfo(object);
                break;
            case Syntax.Identifier:
                return context.getBindingByName(object.name);
                break;
            case Syntax.ThisExpression:
                return context.getBindingByName("this");
                break;
            default:
                throw new Error("Unhandled object type in TypeInference: " + object.type);
        }
    }

    var evaluateTruth = function(exp) {
        return !!exp;
    }

    var log = function(str) {};
    //var log = function() { console.log.apply(console, arguments); };


    var enterHandlers = {
        // On enter
        ConditionalExpression: function (node, parent, ctx, root) {
            var result = new Annotation(node);

            root.traverse(node.test);
            var test = ctx.createTypeInfo(node.test);

            // console.log(node.test, node.consequent, node.alternate);
            if (test.hasStaticValue()) {
                var testResult = evaluateTruth(test.getStaticValue());
                if (testResult === true) {
                    root.traverse(node.consequent);
                    consequent = ctx.createTypeInfo(node.consequent);
                    result.copy(consequent);
                    var alternate = new Annotation(node.alternate);
                    alternate.eliminate();
                } else {
                    root.traverse(node.alternate);
                    var alternate = ctx.createTypeInfo(node.alternate);
                    result.copy(alternate);
                    var consequent = new Annotation(node.consequent);
                    consequent.eliminate();
                }
            } else {
                // We can't decide, thus traverse both;
                root.traverse(node.consequent);
                root.traverse(node.alternate);
                var consequent = ctx.createTypeInfo(node.consequent),
                    alternate = ctx.createTypeInfo(node.alternate);


                if (consequent.equals(alternate)) {
                    result.copy(consequent);
                } else if (consequent.canNumber() && alternate.canNumber()) {
                    result.setType(TYPES.NUMBER);
                }
                else if (test.isNullOrUndefined()) {
                    result.setType(alternate.getType())
                } else {
                    // We don't allow dynamic types (the type of the result depends on the value of it's operands).
                    // At this point, the expression needs to evaluate to a result, otherwise it's an error
                    throw Shade.throwError(node, "Static evaluation not implemented yet");
                }
            }
            return VisitorOption.Skip;

        },
        Literal: function (literal) {
            //console.log(literal);
            var value = literal.raw !== undefined ? literal.raw : literal.value,
                result = new Annotation(literal);

            var number = parseFloat(value);

            if (!isNaN(number)) {
                if (value.indexOf(".") == -1) {
                    result.setType(TYPES.INT);
                }
                else {
                    result.setType(TYPES.NUMBER);
                }
                result.setStaticValue(number);
            } else if (value === 'true') {
                result.setType(TYPES.BOOLEAN);
                result.setStaticValue(true);
            } else if (value === 'false') {
                result.setType(TYPES.BOOLEAN);
                result.setStaticValue(false);
            } else if (value === 'null') {
                result.setType(TYPES.NULL);
            } else {
                result.setType(TYPES.STRING);
                result.setStaticValue(value);
            }
        }
    }

    var handlers = {
        AssignmentExpression: function (node, ctx) {
            var right = ctx.createTypeInfo(node.right),
                result = new Annotation(node);

            result.copy(right);
            if (node.left.type == Syntax.Identifier) {
                var name = node.left.name;
                if (ctx.inDeclaration === true) {
                    ctx.declareVariable(name, true, result)
                }
                ctx.updateExpression(name, right);
            } else {
                throw new Error("Assignment expression");
            }
        },


        NewExpression: function(node, parent, ctx) {
            var result = new Annotation(node);

            var entry = ctx.getBindingByName(node.callee.name);
            //console.error(entry);
            if (entry && entry.hasConstructor()) {
                var constructor = entry.getConstructor();
                var args = Annotation.createAnnotatedNodeArray(node.arguments, ctx);
                var extra = constructor.evaluate(result, args, ctx);
                result.setFromExtra(extra);
            }
           else {
                throw new Error("ReferenceError: " + node.callee.name + " is not defined");
            }
        },

        UnaryExpression: function (node, ctx) {
            var result = new Annotation(node),
                argument = ctx.createTypeInfo(node.argument),
                operator = node.operator,
                func = UnaryFunctions[operator];

            switch (operator) {
                case "!":

                    result.setType(TYPES.BOOLEAN);
                    break;
                case "+":
                case "-":
                    if (argument.canInt()) {
                        result.setType(TYPES.INT);
                    } else if (argument.canNumber()) {
                        result.setType(TYPES.NUMBER);
                    } else {
                        throw new Error("Can't evaluate '" + operator + '" for ' + argument);
                    }
                    break;
                case "~":
                case "typeof":
                case "void":
                case "delete":
                default:
                    throw new Error("Operator not yet supported: " + operator);
            }
            if (argument.hasStaticValue()) {
                result.setStaticValue(func(argument.getStaticValue()));
            } else {
                result.setDynamicValue();
            }

        },


        Identifier: function (node, ctx) {
            var result = new Annotation(node),
                name = node.name;

            if (name === "undefined") {
                result.setType(TYPES.UNDEFINED);
                return;
            }
        },



        LogicalExpression: function (node, ctx) {
            var left = ctx.createTypeInfo(node.left),
                right = ctx.createTypeInfo(node.right),
                result = new Annotation(node),
                operator = node.operator;

            if (!(operator == "&&" || operator == "||"))
                throw new Error("Operator not supported: " + node.operator);

            if (left.isNullOrUndefined()) {  // evaluates to false
                if (operator == "||") {      // false || x = x
                    result.copy(right);
                    left.eliminate();
                } else {                     // false && x = false
                    result.copy(left);
                    right.eliminate();
                }
            } else if (left.isObject() && operator == "||") { // An object that is not null evaluates to true
                result.copy(left);
                right.eliminate();
            }
            else if (left.getType() == right.getType()) {
                if (left.isObject() && left.getKind() != right.getKind()) {
                    throw new Error("Can't evaluate logical expression with two different kind of objects");
                }
                result.copy(left); // TODO: Static value?
            }
            else {
                // We don't allow dynamic types (the type of the result depends on the value of it's operands).
                // At this point, the expression needs to evaluate to a result, otherwise it's an error
                throw new Error("Static evaluation not implemented yet");
            }
        },


        BinaryExpression: function (node, ctx) {
            //console.log(node.left, node.right);
            var left = ctx.createTypeInfo(node.left),
                right = ctx.createTypeInfo(node.right),
                result = new Annotation(node),
                operator = node.operator,
                func = BinaryFunctions[operator];

            switch (operator) {
                case "+":
                case "-":
                case "*":
                case "/":
                case "%":
                    // int 'op' int => int
                    // int / int => number
                    if (left.isInt() && right.isInt()) {
                        if (operator == "/")
                            result.setType(TYPES.NUMBER);
                        else
                            result.setType(TYPES.INT);
                    }
                    // int 'op' number => number
                    else if (left.isInt() && right.isNumber() || right.isInt() && left.isNumber())
                        result.setType(TYPES.NUMBER);
                    // number 'op' number => number
                    else if (left.isNumber() && right.isNumber())
                        result.setType(TYPES.NUMBER);
                    // int 'op' null => int
                    else if (left.isInt() && right.isNullOrUndefined() || right.isInt() && left.isNullOrUndefined()) {
                        result.setType(TYPES.INT);
                    }
                    // number 'op' null => number
                    else if ((left.isNumber() && right.isNullOrUndefined()) || (right.isNumber() && left.isNullOrUndefined())) {
                        result.setType(TYPES.NUMBER);
                    }
                    else {
                        //console.error(node, left.getType(), operator, right.getType());
                        Shade.throwError(node, "Evaluates to NaN: " + left.getTypeString() + " " + operator + " " + right.getTypeString());
                    }
                    break;
                case "==": // comparison
                case "!=":
                case "===":
                case "!==":
                case ">":
                case "<":
                case ">=":
                case "<=":
                    result.setType(TYPES.BOOLEAN);
                    break;
                default:
                    throw new Error("Operator not supported: " + operator);
            }
            if (left.hasStaticValue() && right.hasStaticValue()) {
                //console.log(left.getStaticValue(), operator, right.getStaticValue());
                result.setStaticValue(func(left.getStaticValue(), right.getStaticValue()));
            } else {
                result.setDynamicValue();
            }

        },


        MemberExpression: function (node, parent, ctx, root) {
            var resultType = ctx.createTypeInfo(node),
                objectAnnotation = new Annotation(node.object),
                propertyAnnotation = new Annotation(node.property),
                propertyName = node.property.name;

            //console.log("Member", node.object.name, node.property.name);
            if (node.computed) {
                if (objectAnnotation.isArray()) {
                    // Property is computed, thus it could be a variable
                    var propertyType =  ctx.createTypeInfo(node.property);
                    if (!propertyType.canInt()) {
                        Shade.throwError(node, "Expected 'int' type for array accessor");
                    }
                    var elementInfo = objectAnnotation.getArrayElementType();
                    resultType.setType(elementInfo.type, elementInfo.kind);
                    return;
                }
                else {
                    Shade.throwError(node, "TypeError: Cannot read property '"+ propertyName + "' of " + objectAnnotation.getTypeString());
                }
            }

            var objectOfInterest = getObjectReferenceFromNode(node.object, ctx);

            objectOfInterest || Shade.throwError(node,"ReferenceError: " + node.object.name + " is not defined. Context: " + ctx.str());

            if (objectOfInterest.getType() == TYPES.UNDEFINED) {  // e.g. var a = undefined; a.unknown;
                Shade.throwError(node, "TypeError: Cannot read property '"+ propertyName +"' of undefined")
            }
            if (objectOfInterest.getType() != TYPES.OBJECT) { // e.g. var a = 5; a.unknown;
                resultType.setType(TYPES.UNDEFINED);
                return;
            }

            var objectInfo = ctx.getObjectInfoFor(objectOfInterest);
            if(!objectInfo)
                Shade.throwError(node, "Internal: Incomplete registration for object: " + objectOfInterest.getTypeString() + ", " + JSON.stringify(node.object));

            objectAnnotation.copy(objectOfInterest);
            if (!objectInfo.hasOwnProperty(propertyName)) {
                resultType.setType(TYPES.UNDEFINED);
                propertyAnnotation.setType(TYPES.UNDEFINED);
                return;
            }

            var propertyTypeInfo = objectInfo[propertyName];
            propertyAnnotation.setFromExtra(propertyTypeInfo);
            resultType.setFromExtra(propertyTypeInfo);
        },

        CallExpression: function (node, ctx, root) {
            var result = new Annotation(node);

            // Call on an object, e.g. Math.cos()
            if (node.callee.type == Syntax.MemberExpression) {
                var callingObject = getObjectReferenceFromNode(node.callee, ctx);

                if (!callingObject.isFunction()) { // e.g. Math.PI()
                    Shade.throwError(node, "TypeError: Object #<" + callingObject.getType()+ "> has no method '"+ node.callee.property.name + "'");
                }

                var object = node.callee.object,
                    propertyName = node.callee.property.name;

                var objectReference = getObjectReferenceFromNode(object, ctx);
                if(!objectReference)  {
                    Shade.throwError(node, "Internal: No object info for: " + object);
                }

                var objectInfo = ctx.getObjectInfoFor(objectReference);
                if(!objectInfo) { // Every object needs an info, otherwise we did something wrong
                    Shade.throwError(node, "Internal Error: No object registered for: " + objectReference.getTypeString() + JSON.stringify(node.object));
                }
                if (objectInfo.hasOwnProperty(propertyName)) {
                    var propertyHandler = objectInfo[propertyName];
                    if (typeof propertyHandler.evaluate == "function") {
                        var args = Annotation.createAnnotatedNodeArray(node.arguments, ctx);
                        var extra = propertyHandler.evaluate(result, args, ctx, objectReference);
                        result.setFromExtra(extra);
                        return;
                    }
                }
            }  else if (node.callee.type == Syntax.Identifier) {
                var functionName = node.callee.name;
                var func = ctx.getBindingByName(functionName);
                if (!func) {
                    Shade.throwError(node, "ReferenceError: " + functionName + " is not defined");
                }
                if(!func.isFunction()) {
                    Shade.throwError(node, "TypeError: " + func.getTypeString() + " is not a function");
                }
                var args = Annotation.createAnnotatedNodeArray(node.arguments, ctx);
                var definingContext = ctx.getContextForName(functionName);
                try {
                var extra = root.getFunctionInformationFor(ctx.getVariableIdentifier(functionName), args, definingContext);
                } catch(e) {
                    Shade.throwError(node, "Failure in function call: " + e.message);
                }
                extra && result.setFromExtra(extra);
                node.callee.name = extra.newName;
                return;
            }

                /*case Syntax.Identifier:
                    var functionName = node.callee.name;
                    var func = ctx.getBindingByName(functionName);
                    if (!(func && func.isInitialized())) {
                        throw new Error(functionName + " is not defined. Context: " + ctx.str());
                    }
                    // console.log(func);
                    //throw new Error("Can't call " + functionName + "() in this context: " + ctx.str());
                    break;
                default:   */
                        throw new Error("Unhandled CallExpression:" + node.callee.type);

        }
    };

    var enterExpression = function (node, parent, ctx) {
        if (enterHandlers.hasOwnProperty(node.type)) {
            return enterHandlers[node.type](node, parent, ctx, this);
        }
    };

    var exitExpression = function (node, parent, ctx) {

        switch (node.type) {
            case Syntax.AssignmentExpression:
                handlers.AssignmentExpression(node, ctx);
                break;
            case Syntax.ArrayExpression:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.ArrayPattern:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.BinaryExpression:
                handlers.BinaryExpression(node, ctx);
                break;
            case Syntax.CallExpression:
                handlers.CallExpression(node, ctx, this);
                break;
            case Syntax.ConditionalExpression:
                break;
            case Syntax.FunctionExpression:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.Identifier:
                handlers.Identifier(node, ctx);
                break;
            case Syntax.Literal:
                break;
            case Syntax.LogicalExpression:
                handlers.LogicalExpression(node, ctx);
                break;
            case Syntax.MemberExpression:
                handlers.MemberExpression(node, parent, ctx, this);
                break;
            case Syntax.NewExpression:
                handlers.NewExpression(node, parent, ctx);
                break;
            case Syntax.ObjectExpression:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.ObjectPattern:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.Property:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.SequenceExpression:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.ThisExpression:
                break;
            case Syntax.UnaryExpression:
                handlers.UnaryExpression(node, ctx);
                break;
            case Syntax.UpdateExpression:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.YieldExpression:
                log(node.type + " is not handle yet.");
                break;
            default:
                throw new Error('Unknown node type: ' + node.type);


        }

    };


    ns.enterExpression = enterExpression;
    ns.exitExpression = exitExpression;
}(exports));

},{"../../interfaces.js":36,"./../../base/annotation.js":19,"./../../base/index.js":21,"estraverse":4}],7:[function(require,module,exports){
(function (ns) {

    var walk = require('estraverse'),
        enterExpression = require('./infer_expression.js').enterExpression,
        exitExpression = require('./infer_expression.js').exitExpression,
        Syntax = require('estraverse').Syntax,
        TYPES = require("../../interfaces.js").TYPES,
        Annotation = require("./../../base/annotation.js").Annotation,
        FunctionAnnotation = require("./../../base/annotation.js").FunctionAnnotation;

    var log = function(str) {};
    //var log = function() { console.log.apply(console, arguments); };

    var enterHandler = {
        ForStatement: function(node, ctx, root) {
            var ctx = root.createContext(node, ctx);
            root.pushContext(ctx);

            root.traverse(node.init);
            root.traverse(node.test);

            var test = new Annotation(node.test);
            if (test.hasStaticValue()) { // Great! We can evaluate it!
                // TODO
            }

            root.traverse(node.update);
            root.traverse(node.body);
            root.popContext();
            return walk.VisitorOption.Skip;
        },

        IfStatement: (function() {

            var c_evaluate = function(exp) {
                return !!exp;
            }

            return function(node, ctx, root) {
                root.traverse(node.test);
                var test = new Annotation(node.test);
                if (test.hasStaticValue()) { // Great! We can evaluate it!
                    //console.log("Static value in if test!");
                    var testResult = c_evaluate(test.getStaticValue());
                    if(!testResult) {
                        if (node.alternate)
                            root.traverse(node.alternate);

                        var consequent = new Annotation(node.consequent);
                        consequent.eliminate();
                    } else {
                        root.traverse(node.consequent);
                        if(node.alternate) {
                            var alternate = new Annotation(node.alternate);
                            alternate.eliminate();
                        }
                    }
                    return walk.VisitorOption.Skip;
                }
            }
        }()),

        VariableDeclaration: function(node, ctx) {
            ctx.inDeclaration = true;
        },


        /**
         * @param {Object} node
         * @param {Context} parentContext
         * @param {TypeInference} root
         */
        FunctionDeclaration: function(node, parentContext, root) {
            var result = new FunctionAnnotation(node);

            if (node.id.type != Syntax.Identifier) {
                throw new Error("Dynamic variable names are not yet supported");
            }
            var functionName = node.id.name;
            var functionContext = root.createContext(node, parentContext, functionName);
            functionContext.declareParameters(node.params);
            root.pushContext(functionContext);
            if(functionContext.str() != root.entryPoint) {
                return walk.VisitorOption.Skip;
            }
        }
    }

    var exitHandler = {
        /**
         * @param node
         * @param {Context} ctx
         * @param {TypeInference} root
         */
        FunctionDeclaration: function(node, ctx, root) {
            var result = new FunctionAnnotation(node);
            var returnInfo = ctx.getReturnInfo();
            result.setReturnInfo(returnInfo || { type: TYPES.UNDEFINED });
            root.popContext();
        },
        VariableDeclaration: function(node, ctx) {
            ctx.inDeclaration = false;
        },
        VariableDeclarator: function(node, ctx) {
            var result = new Annotation(node);

            if (node.id.type != Syntax.Identifier) {
                throw new Error("Dynamic variable names are not yet supported");
            }
            var variableName = node.id.name;
            ctx.declareVariable(variableName, true, result);

            if (node.init) {
                var init = ctx.createTypeInfo(node.init);
                result.copy(init);
                ctx.updateExpression(variableName, init);
            } else {
                result.setType(TYPES.UNDEFINED);
            }
            // TODO: result.setType(init.getType());
        },
        ReturnStatement: function(node, parent, ctx) {
            var result = new Annotation(node),
                argument = node.argument ? ctx.createTypeInfo(node.argument) : null;

            if (argument) {
                result.copy(argument);
            } else {
                result.setType(TYPES.UNDEFINED);
            }
            ctx.updateReturnInfo(result);
        }

    }




    var enterStatement = function (node, parent, ctx) {
        switch (node.type) {
            case Syntax.ForStatement:
                return enterHandler.ForStatement(node, ctx, this);
            case Syntax.IfStatement:
                return enterHandler.IfStatement(node, ctx, this);
            case Syntax.VariableDeclaration:
                return enterHandler.VariableDeclaration(node, ctx);
            case Syntax.FunctionDeclaration:
                return enterHandler.FunctionDeclaration(node, ctx, this);

        }
        return;


    };

    var exitStatement = function (node, parent, ctx) {

        switch (node.type) {
            case Syntax.ExpressionStatement:
                var result = new Annotation(node),
                    expression = new Annotation(node.expression);

                result.copy(expression);

                break;
            case Syntax.BlockStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.BreakStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.CatchClause:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.ContinueStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.DirectiveStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.DoWhileStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.DebuggerStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.EmptyStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.ForStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.ForInStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.FunctionDeclaration:
                return exitHandler.FunctionDeclaration(node, ctx, this);
                break;
            case Syntax.IfStatement:
                break;
            case Syntax.LabeledStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.Program:
                break;
            case Syntax.ReturnStatement:
                return exitHandler.ReturnStatement(node, parent, ctx);
                break;
            case Syntax.SwitchStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.SwitchCase:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.ThrowStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.TryStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.VariableDeclaration:
                return exitHandler.VariableDeclaration(node, ctx);
            case Syntax.VariableDeclarator:
                exitHandler.VariableDeclarator(node, ctx);
                break;
            case Syntax.WhileStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.WithStatement:
                log(node.type + " is not handle yet.");
                break;
            default:
                throw new Error('Unknown node type: ' + node.type);
        }

    };

    ns.enterStatement = enterStatement;
    ns.exitStatement = exitStatement;
}(exports));

},{"../../interfaces.js":36,"./../../base/annotation.js":19,"./infer_expression.js":6,"estraverse":4}],8:[function(require,module,exports){
(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Tools = require("./tools.js");

    var ColorClosureInstance = {
        multiply: {
            type: TYPES.FUNCTION,
            evaluate: function() {
                return {
                    type: TYPES.OBJECT,
                    kind: KINDS.COLOR_CLOSURE
                };
            }
        },
        add: {
            type: TYPES.FUNCTION,
            evaluate: function() {
                return {
                    type: TYPES.OBJECT,
                    kind: KINDS.COLOR_CLOSURE
                };
            }
        }
    };

    Tools.extend(ns, {
        id: "ColorClosure",
        kind: KINDS.COLOR_CLOSURE,
        object: null,
        instance: ColorClosureInstance
    });


}(exports));

},{"../../../interfaces.js":36,"./tools.js":14}],9:[function(require,module,exports){
(function (ns) {

    var objects = {
        Shade : require("./shade.js"),
        Matrix4 : require("./matrix.js"),
        Math : require("./math.js"),
        Vec2 : require("./vec2.js"),
        Vec3 : require("./vec3.js"),
        Color: require("./vec3.js"),
        Vec4 : require("./vec4.js"),
        System: require("./system.js"),
        ColorClosure: require("./colorclosure.js")
    };

    exports.Registry = {
        name: "TypeInference",
        getByName: function(name) {
            var result = objects[name];
            return result || null;
        },
        getInstanceForKind: function(kind) {
            for(var obj in objects) {
                if (objects[obj].kind == kind) {
                    return objects[obj].instance;
                }
            }
            return null;
        }
    }

}(exports));

},{"./colorclosure.js":8,"./math.js":10,"./matrix.js":11,"./shade.js":12,"./system.js":13,"./vec2.js":15,"./vec3.js":16,"./vec4.js":17}],10:[function(require,module,exports){
(function (ns) {

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        Base = require("../../../base/index.js"),
        Tools = require("./tools.js");


    var evaluateMethod = function (name, paramCount, returnType) {
        /**
         * @param {Annotation} result
         * @param {Array.<Annotation>} args
         * @param {Context} ctx
         */
        return function (result, args, ctx) {
            if (paramCount != -1) { // Arbitrary number of arguments
                if (!args || args.length != paramCount) {
                    throw new Error("Invalid number of parameters for Math." + name + ", expected " + paramCount);
                }
            }

            var argArray = [];
            var isStatic = true;
            args.forEach(function (param, index) {
                if (!param.canNumber())
                    throw new Error("Parameter " + index + " has invalid type for Math." + name + ", expected 'number', but got " + param.getType());
                isStatic = isStatic && param.hasStaticValue();
                if (isStatic)
                    argArray.push(param.getStaticValue());
            });
            var typeInfo = {
                type: returnType || TYPES.NUMBER
            }
            if (isStatic) {
                typeInfo.staticValue = Math[name].apply(undefined, argArray);
            }
            return typeInfo;
        }
    }

    var MathObject = {
        random: {
            type: TYPES.FUNCTION,
            evaluate: function(node, args) {
                if (args.length)
                    throw new Error("Math.random has no parameters.");
                return {
                    type: TYPES.NUMBER
                }
            }
        },
        abs: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args) {
                Tools.checkParamCount(result.node, "Math.abs", [1], args.length);
                var typeInfo = {};
                switch(args[0].getType()) {
                    case TYPES.NUMBER:
                    case TYPES.INT:
                        typeInfo.type = args[0].getType();
                        break;
                    default:
                        Shade.throwError(result.node, "InvalidType for Math.abs");
                }
                return typeInfo;
            }
        }
    };

    var MathConstants = ["E", "PI", "LN2", "LOG2E", "LOG10E", "PI", "SQRT1_2", "SQRT2"];
    var OneParameterNumberMethods = ["acos", "asin", "atan", "cos", "exp", "log", "round", "sin", "sqrt", "tan"];
    var OneParameterIntMethods = ["ceil", "floor"];
    var TwoParameterNumberMethods = ["atan2", "pow"];
    var ArbitraryParameterNumberMethods = ["max", "min"];

    MathConstants.forEach(function (constant) {
        MathObject[constant] = { type: TYPES.NUMBER, staticValue: Math[constant] };
    });

    OneParameterNumberMethods.forEach(function (method) {
        MathObject[method] = { type: TYPES.FUNCTION, evaluate: evaluateMethod(method, 1) };
    });

    TwoParameterNumberMethods.forEach(function (method) {
        MathObject[method] = { type: TYPES.FUNCTION, evaluate: evaluateMethod(method, 2) };
    });

    OneParameterIntMethods.forEach(function (method) {
        MathObject[method] = { type: TYPES.FUNCTION, evaluate: evaluateMethod(method, 1, TYPES.INT) };
    });

    ArbitraryParameterNumberMethods.forEach(function (method) {
        MathObject[method] = { type: TYPES.FUNCTION, evaluate: evaluateMethod(method, -1) };
    });

    Base.extend(ns, {
        id: "Math",
        object: {
            constructor: null,
            static: MathObject
        },
        instance: MathObject
    });


}(exports));

},{"../../../base/index.js":21,"../../../interfaces.js":36,"./tools.js":14}],11:[function(require,module,exports){
(function (ns) {

    var interfaces = require("../../../interfaces.js"),
    Tools = require("./tools.js");

    var TYPES = interfaces.TYPES,
        KINDS = interfaces.OBJECT_KINDS;

    var MatrixInstance = {
        transformPoint: {
            type: TYPES.UNDEFINED,
            evaluate: function(result, args) {
                Tools.checkParamCount(result.node, "Matrix::transformPoint", [1,2], args.length);
                var sourcePoint = targetPoint = args[0];
                if (!(sourcePoint.isObject() && sourcePoint.canNormal())) {
                    throw new Error("First argument of Matrix::transformPoint must evaluate to a point, found: " + sourcePoint.getTypeString());
                }


            }
        }
    }

    Tools.extend(ns, {
        id: "Matrix4",
        kind: "matrix4",
        object: {
            constructor: null,
            static: null
        },
        instance: MatrixInstance
    });

}(exports));

},{"../../../interfaces.js":36,"./tools.js":14}],12:[function(require,module,exports){
(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Base = require("../../../base/index.js"),
        Tools = require("./tools.js");

    var ShadeObject = {
        diffuse: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args, ctx) {
                if (args.length < 1)
                    throw new Error("Shade.diffuse expects at least 1 parameter.")
                var normal = args[0];
                if(!(normal && normal.canNormal())) {
                    throw new Error("First argument of Shade.diffuse must evaluate to a normal");
                }
                if (args.length > 1) {
                    var color = args[1];
                    //console.log("Color: ", color.str(), color.getType(ctx));
                    if(!color.canColor()) {
                        throw new Error("Second argument of Shade.diffuse must evaluate to a color. Found: " + color.str());
                    }
                }
                return {
                    type: TYPES.OBJECT,
                    kind: KINDS.COLOR_CLOSURE
                };
            }
        },
        phong: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args, ctx) {
                if (args.length < 1)
                    throw new Error("Shade.phong expects at least 1 parameter.")
                var normal = args[0];
                if(!(normal && normal.canNormal())) {
                    throw new Error("First argument of Shade.phong must evaluate to a normal");
                }
                if (args.length > 1) {
                    var shininess = args[1];
                    //console.log("Color: ", color.str(), color.getType(ctx));
                    if(!shininess.canNumber()) {
                        throw new Error("Second argument of Shade.phong must evaluate to a number. Found: " + color.str());
                    }
                }
                return {
                    type: TYPES.OBJECT,
                    kind: KINDS.COLOR_CLOSURE
                };
            }
        },
        clamp: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args) {
                Tools.checkParamCount(result.node, "Shade.clamp", [3], args.length);

                if (args.every(function(e) { return e.canNumber(); })) {
                    var typeInfo = {
                        type: TYPES.NUMBER
                    }
                    if (Tools.allArgumentsAreStatic(args)) {
                        var callArgs = args.map(function(a) {return a.getStaticValue(); });
                        typeInfo.staticValue = Shade.Shade.clamp.apply(null, callArgs);
                    }
                    return typeInfo;
                }
                Shade.throwError(result.node, "Shade.clamp not supported with argument types: " + args.map(function(arg) { return arg.getTypeString(); }).join(", "));
            }
        },
        smoothstep: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args, ctx) {
                Tools.checkParamCount(result.node, "Shade.smoothstep", [3], args.length);

                if (args.every(function(e) { return e.canNumber(); })) {
                    var typeInfo = {
                        type: TYPES.NUMBER
                    }
                    if (Tools.allArgumentsAreStatic(args)) {
                        var callArgs = args.map(function(a) {return a.getStaticValue(); });
                        typeInfo.staticValue = Shade.Shade.smoothstep.apply(null, callArgs);
                    }
                    return typeInfo;
                }
                Shade.throwError(result.node, "Shade.smoothstep not supported with argument types: " + args.map(function(arg) { return arg.getTypeString(); }).join(", "));
            }
        },
        step: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args, ctx) {
                Tools.checkParamCount(result.node, "Shade.step", [2], args.length);

                if (args.every(function(e) { return e.canNumber(); })) {
                    var typeInfo = {
                        type: TYPES.NUMBER
                    }
                    if (Tools.allArgumentsAreStatic(args)) {
                        var callArgs = args.map(function(a) {return a.getStaticValue(); });
                        typeInfo.staticValue = Shade.Shade.step.apply(null, callArgs);
                    }
                    return typeInfo;
                }
                Shade.throwError(result.node, "Shade.step not supported with argument types: " + args.map(function(arg) { return arg.getTypeString(); }).join(", "));
            }
        },
        fract: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args) {
                Tools.checkParamCount(result.node, "Shade.fract", [1], args.length);

                var x = args[0];
                if (x.canNumber()) {
                    var typeInfo = {
                        type: TYPES.NUMBER
                    }

                    if (x.hasStaticValue()) {
                        typeInfo.staticValue = Shade.Shade.fract(x.getStaticValue());
                    }
                    return typeInfo;
                }
                Shade.throwError(result.node, "Shade.fract not supported with argument types: " + args.map(function(arg) { return arg.getTypeString(); }).join(", "));
            }
        }
    };

    Base.extend(ns, {
        id: "Shade",
        object: {
            constructor: null,
            static: ShadeObject
        },
        instance: null
    });

}(exports));

},{"../../../base/index.js":21,"../../../interfaces.js":36,"./tools.js":14}],13:[function(require,module,exports){
(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Base = require("../../../base/index.js");

    var SystemObject = {
        coords: {
            type: TYPES.OBJECT,
            kind: KINDS.FLOAT3
        },
        normalizedCoords: {
            type: TYPES.OBJECT,
            kind: KINDS.FLOAT3
        },
        height: {
            type: TYPES.INT
        },
        width: {
            type: TYPES.INT
        }

    };

    Base.extend(ns, {
        id: "System",
        object: {
            constructor: null,
            static: SystemObject
        },
        instance: null
    });

}(exports));

},{"../../../base/index.js":21,"../../../interfaces.js":36}],14:[function(require,module,exports){
(function(ns){
    var Base = require("../../../base/index.js");
    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        VecBase = require("../../../base/vec.js");

    var allArgumentsAreStatic = function (args) {
        return args.every(function (arg) {
            return arg.hasStaticValue()
        });
    }

    ns.checkParamCount = function(node, name, allowed, is) {
        if (allowed.indexOf(is) == -1) {
            Shade.throwError(node, "Invalid number of parameters for " + name + ", expected " + allowed.join(" or ") + ", found: " + is);
        }
    }

    ns.singleAccessor = function (name, obj, validArgCounts, staticValueFunction) {
        return {
            type: TYPES.FUNCTION,
            evaluate: function (result, args, ctx, callObject) {
                ns.checkParamCount(result.node, name, validArgCounts, args.length);
                var typeInfo =  args.length ? obj : { type: TYPES.NUMBER };

                if (staticValueFunction && callObject.hasStaticValue() && args.every(function(a) {return a.hasStaticValue(); })) {
                    typeInfo.staticValue = staticValueFunction(callObject.getStaticValue(), args);
                }
                return typeInfo;
            }
        }
    };

    ns.extend = Base.extend;

    var Vec = {
        TYPES: {
            1: { type: TYPES.NUMBER },
            2: { type: TYPES.OBJECT, kind: KINDS.FLOAT2 },
            3: { type: TYPES.OBJECT, kind: KINDS.FLOAT3 },
            4: { type: TYPES.OBJECT, kind: KINDS.FLOAT4 },
            color: { type: TYPES.OBJECT, kind: KINDS.FLOAT3 }
        },
        getType: function(destVector, color){
            if(destVector == 4 && color)
                return Vec.TYPES.color;
            else
                return Vec.TYPES[destVector];
        },
        getStaticValue: function(typeInfo, methodName, args, callObject){
            if(callObject.hasStaticValue() && allArgumentsAreStatic(args)){
                var object = callObject.getStaticValue();
                var callArgs = args.map(function(a) {return a.getStaticValue(); });
                var method = object[methodName];
                if(method)
                    typeInfo.staticValue = method.apply(object, callArgs);
            }
        },
        checkVecArguments: function(methodName, color, vecSize, withEmpty, result, args){
            withEmpty = (withEmpty || vecSize == 0);
            color = color && vecSize == 4;
            var allowed = [];
            for(var i = withEmpty ? 0 : 1; i <= vecSize; ++i) allowed.push(i);
            ns.checkParamCount(result.node, methodName, allowed, args.length);

            if(withEmpty && args.length == 0)
                return;

            if(args.length == 1 && args[0].canNumber())
                return;

            var idx = 0;
            for(var i = 0; idx < vecSize && i < args.length; ++i){
                var arg= args[i], cnt;
                if(arg.canNumber()) cnt = 1;
                else if(arg.isOfKind(KINDS.FLOAT2)) cnt = 2;
                else if(arg.isOfKind(KINDS.FLOAT3)) cnt = 3;
                else if(arg.isOfKind(KINDS.FLOAT4)) cnt = 4;
                else Shade.throwError(result.node, "Inavlid parameter for " + methodName + ", type is not supported");
                // TODO: Print Type?
                idx += cnt;
            }

            if(idx < vecSize && (!color || idx + 1 < vecSize))
                Shade.throwError(result.node, "Inavlid parameters for " + methodName + ", expected " + vecSize + " scalar values, got " + idx);
            else if(i < args.length){
                Shade.throwError(result.node, "Inavlid parameters for " + methodName + ", too many parameters");
            }
        },
        vecEvaluate: function(objectName, methodName, color, destVecSize, srcVecSize, result, args, ctx, callObject){
            Vec.checkVecArguments(objectName + "." + methodName, color, srcVecSize, false, result, args);

            var typeInfo = {};
            Base.extend(typeInfo, Vec.getType(destVecSize, color));

            Vec.getStaticValue(typeInfo, methodName, args, callObject);
            return typeInfo;
        },

        optionalZeroEvaluate: function(objectName, color, methodName, destVecSize, zeroDestVecSize, srcVecSize, result, args, ctx, callObject) {
            var qualifiedName = objectName + "." + methodName;
            var typeInfo = {};

            if(args.length == 0){
                Base.extend(typeInfo, Vec.getType(zeroDestVecSize, color));
            }
            else{
                Vec.checkVecArguments(qualifiedName, color, srcVecSize, true, result, args);
                Base.extend(typeInfo, Vec.getType(destVecSize, color));
            }
            Vec.getStaticValue(typeInfo, methodName, args, callObject);

            return typeInfo;
        },

        swizzleEvaluate: function(objectName, color, vecSize, swizzle, withSetter, result, args, ctx, callObject) {
            if(withSetter){
                return Vec.optionalZeroEvaluate(objectName, color, swizzle, vecSize, swizzle.length, swizzle.length,
                    result, args, ctx, callObject);
            }
            else{
                return Vec.vecEvaluate(objectName, swizzle, color, swizzle.length, 0, result, args, ctx, callObject);
            }
        },
        getSwizzleEvaluate: function(objectName, color, vecSize, swizzle){
            var indices = [], withSetter = (swizzle.length <= vecSize);
            for(var i = 0; withSetter && i < swizzle.length; ++i){
                var idx = VecBase.swizzleToIndex(swizzle.charAt(i));
                if(indices[idx])
                    withSetter = false;
                else
                    indices[idx] = true;
            }
            return  {
                type: TYPES.FUNCTION,
                evaluate: Vec.swizzleEvaluate.bind(null, objectName, color, vecSize, swizzle, withSetter)
            }
        },
        attachSwizzles: function (instance, objectName, color, vecCount){
            for(var s = 0; s < VecBase.swizzleSets.length; ++s){
                for(var count = 1; count <= 4; ++count){
                    var max = Math.pow(vecCount, count);
                     for(var i = 0; i < max; ++i){
                        var val = i;
                        var key = "";
                        for(var  j = 0; j < count; ++j){
                            var idx = val % vecCount;
                            val = Math.floor(val / vecCount);
                            key+= VecBase.swizzleSets[s][idx];
                        }
                        instance[key] = Vec.getSwizzleEvaluate(objectName, color, vecCount, key);
                    }
                }
            }
        },
        attachVecMethods: function(instance, objectName, color, destVecSize, srcVecSize, methodNames){
            for(var i = 0; i < methodNames.length; ++i){
                var methodName = methodNames[i];
                instance[methodName] = {
                    type: TYPES.FUNCTION,
                    evaluate: Vec.vecEvaluate.bind(null, objectName, methodName, color, destVecSize, srcVecSize)
                }
            }
        },
        constructorEvaluate: function(objectName, color, vecSize, result, args, ctx) {
            Vec.checkVecArguments(objectName, color, vecSize, true, result, args);
            var argArray = [];
            var isStatic = true;
            args.forEach(function (param, index) {
                isStatic = isStatic && param.hasStaticValue();
                if (isStatic)
                    argArray.push(param.getStaticValue());
            });

            var typeInfo = Base.extend({},Vec.getType(vecSize, color));

            if (isStatic) {
                var v = new Shade[objectName]();
                Shade[objectName].apply(v, argArray);
                typeInfo.staticValue = v;
            }
            return typeInfo;
        }

    };
    ns.Vec = Vec;
    ns.allArgumentsAreStatic = allArgumentsAreStatic;


}(exports));

},{"../../../base/index.js":21,"../../../base/vec.js":23,"../../../interfaces.js":36}],15:[function(require,module,exports){
(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Tools = require("./tools.js");

    var Vector2Constructor =  {
        type: TYPES.OBJECT,
        kind: KINDS.FLOAT2,
        /**
         * @param {Annotation} result
         * @param {Array.<Annotation>} args
         * @param {Context} ctx
         */
        evaluate: Tools.Vec.constructorEvaluate.bind(null, "Vec2", false, 2)
    };

    var Vector2StaticObject = {
    };

    var Vector2Instance = {
        length: {
            type: TYPES.FUNCTION,
            evaluate: Tools.Vec.optionalZeroEvaluate.bind(null,"Vec2", false, "length", 2, 1, 1)
        }
    };
    Tools.Vec.attachSwizzles(Vector2Instance, "Vec2", false, 2);
    Tools.Vec.attachVecMethods(Vector2Instance, "Vec2", false, 2, 2, ['add', 'sub', 'mul', 'div', 'mod']);
    Tools.Vec.attachVecMethods(Vector2Instance, "Vec2", false, 1, 2, ['dot']);
    Tools.Vec.attachVecMethods(Vector2Instance, "Vec2", false, 2, 0, ['normalize']);


    Tools.extend(ns, {
        id: "Vec2",
        kind: KINDS.FLOAT2,
        object: {
            constructor: Vector2Constructor,
            static: Vector2StaticObject
        },
        instance: Vector2Instance
    });


}(exports));

},{"../../../interfaces.js":36,"./tools.js":14}],16:[function(require,module,exports){
(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Tools = require("./tools.js");

    var Vector3Constructor =  {
        type: TYPES.OBJECT,
        kind: KINDS.FLOAT3,
        /**
         * @param {Annotation} result
         * @param {Array.<Annotation>} args
         * @param {Context} ctx
         */
        evaluate: Tools.Vec.constructorEvaluate.bind(null, "Vec3", false, 3)
    };

    var Vector3StaticObject = {
    };

    var Vector3Instance = {
        length: {
            type: TYPES.FUNCTION,
            evaluate: Tools.Vec.optionalZeroEvaluate.bind(null,"Vec3", false, "length", 3, 1, 1)
        }
    };
    Tools.Vec.attachSwizzles(Vector3Instance, "Vec3", false, 3);
    Tools.Vec.attachVecMethods(Vector3Instance, "Vec3", false, 3, 3, ['add', 'sub', 'mul', 'div', 'mod']);
    Tools.Vec.attachVecMethods(Vector3Instance, "Vec3", false, 1, 3, ['dot']);
    Tools.Vec.attachVecMethods(Vector3Instance, "Vec3", false, 3, 0, ['normalize']);


    Tools.extend(ns, {
        id: "Vec3",
        kind: KINDS.FLOAT3,
        object: {
            constructor: Vector3Constructor,
            static: Vector3StaticObject
        },
        instance: Vector3Instance
    });


}(exports));

},{"../../../interfaces.js":36,"./tools.js":14}],17:[function(require,module,exports){
(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Tools = require("./tools.js");

    var Vector4Constructor =  {
        type: TYPES.OBJECT,
        kind: KINDS.FLOAT4,
        /**
         * @param {Annotation} result
         * @param {Array.<Annotation>} args
         * @param {Context} ctx
         */
        evaluate: Tools.Vec.constructorEvaluate.bind(null, "Vec4", false, 4)
    };

    var Vector4StaticObject = {
    };

    var Vector4Instance = {
        length: {
            type: TYPES.FUNCTION,
            evaluate: Tools.Vec.optionalZeroEvaluate.bind(null,"Vec4", false, "length", 4, 1, 1)
        }
    };
    Tools.Vec.attachSwizzles(Vector4Instance, "Vec4", false, 4);
    Tools.Vec.attachVecMethods(Vector4Instance, "Vec4", false, 4, 4, ['add', 'sub', 'mul', 'div', 'mod']);
    Tools.Vec.attachVecMethods(Vector4Instance, "Vec4", false, 1, 4, ['dot']);
    Tools.Vec.attachVecMethods(Vector4Instance, "Vec4", false, 4, 0, ['normalize']);


    Tools.extend(ns, {
        id: "Vec4",
        kind: KINDS.FLOAT4,
        object: {
            constructor: Vector4Constructor,
            static: Vector4StaticObject
        },
        instance: Vector4Instance
    });


}(exports));

},{"../../../interfaces.js":36,"./tools.js":14}],18:[function(require,module,exports){
(function (ns) {
    /**
     * Shade.js specific type inference that is also inferring
     * virtual types {@link Shade.TYPES }
     */

    var walk = require('estraverse'),
        enterExpression = require('./infer_expression.js').enterExpression,
        exitExpression = require('./infer_expression.js').exitExpression,
        enterStatement = require('./infer_statement.js').enterStatement,
        exitStatement = require('./infer_statement.js').exitStatement,

        ObjectRegistry = require("./registry/index.js").Registry,
        Context = require("./../../base/context.js").getContext(ObjectRegistry),
        Base = require("../../base/index.js"),
        Annotation = require("./../../base/annotation.js").Annotation,
        FunctionAnnotation = require("./../../base/annotation.js").FunctionAnnotation;



    var Syntax = walk.Syntax;


    var registerGlobalContext = function (program) {
        var ctx = new Context(program, null, {name: "global"});
        ctx.registerObject("Math", ObjectRegistry.getByName("Math"));
        ctx.registerObject("Color", ObjectRegistry.getByName("Color"));
        ctx.registerObject("Vec2", ObjectRegistry.getByName("Vec2"));
        ctx.registerObject("Vec3", ObjectRegistry.getByName("Vec3"));
        ctx.registerObject("Vec4", ObjectRegistry.getByName("Vec4"));
        ctx.registerObject("Shade", ObjectRegistry.getByName("Shade"));
        ctx.registerObject("this", ObjectRegistry.getByName("System"));
        return ctx;
    }

    var TypeInference = function (root, opt) {
        opt = opt || {};
        this.root = root;
        this.context = [];
        /** @type {Object.<String, Array.<TypeInfo>} **/
        this.injections = {};
        this.entryPoint = opt.entry || "global.shade";
        this.root.injections = this.injections;
        this.functions = {
            orig: {},
            derived: {}
        }

    }

    Base.extend(TypeInference.prototype, {
        pushContext: function (context) {
            this.context.push(context);
            var injection = this.injections[context.str()];
            if (injection) {
                context.injectParameters(injection);
            }
        },
        popContext: function () {
            this.context.pop();
        },
        peekContext: function () {
            return this.context[this.context.length - 1];
        },
        createContext: function (node, parentContext, name) {
           var result = new Context(node, parentContext, {name: name } );
           return result;
        },

        annotateParameters: function(arr) {
            return arr ? arr.map(function(param) {
                var annotated =  new Annotation(param);
                return annotated;
            }) : [];
        },


        buildFunctionMap: function(prg) {
            var that = this;
            walk.replace(prg, {
                enter: function(node) {
                    if (node.type == Syntax.FunctionDeclaration) {
                        var result = new FunctionAnnotation(node);
                        var functionName = node.id.name;
                        var parentContext = that.peekContext();
                        var functionContext = that.createContext(node, parentContext, functionName);
                        functionContext.declareParameters(node.params);
                        parentContext.declareVariable(functionName);
                        parentContext.updateExpression(functionName, result);
                        that.pushContext(functionContext);
                        that.functions.orig[functionContext.str()] = node;
                    }
                },
                leave: function(node) {
                    if (node.type == Syntax.FunctionDeclaration) {
                        that.popContext();
                        return { type: Syntax.EmptyStatement };
                    }
                }
            });
           prg.body = prg.body.filter(function(a) { return a.type != Syntax.EmptyStatement; });
        },

        traverse: function (node) {
            walk.traverse(node, {
                enter: this.enterNode.bind(this),
                leave: this.exitNode.bind(this)
            });
            return node;
        },

        enterNode: function (node, parent) {
            var context = this.context[this.context.length - 1];
            return this.switchKind(node, parent, context, enterStatement, enterExpression);
        },

        exitNode: function (node, parent) {
            var context = this.context[this.context.length - 1];
            return this.switchKind(node, parent, context, exitStatement, exitExpression);
        },

        switchKind: function (node, parent, ctx, statement, expression) {
            switch (node.type) {
                case Syntax.BlockStatement:
                case Syntax.BreakStatement:
                case Syntax.CatchClause:
                case Syntax.ContinueStatement:
                case Syntax.DirectiveStatement:
                case Syntax.DoWhileStatement:
                case Syntax.DebuggerStatement:
                case Syntax.EmptyStatement:
                case Syntax.ExpressionStatement:
                case Syntax.ForStatement:
                case Syntax.ForInStatement:
                case Syntax.FunctionDeclaration:
                case Syntax.IfStatement:
                case Syntax.LabeledStatement:
                case Syntax.Program:
                case Syntax.ReturnStatement:
                case Syntax.SwitchStatement:
                case Syntax.SwitchCase:
                case Syntax.ThrowStatement:
                case Syntax.TryStatement:
                case Syntax.VariableDeclaration:
                case Syntax.VariableDeclarator:
                case Syntax.WhileStatement:
                case Syntax.WithStatement:
                    return statement.call(this, node, parent, ctx);

                case Syntax.AssignmentExpression:
                case Syntax.ArrayExpression:
                case Syntax.ArrayPattern:
                case Syntax.BinaryExpression:
                case Syntax.CallExpression:
                case Syntax.ConditionalExpression:
                case Syntax.FunctionExpression:
                case Syntax.Identifier:
                case Syntax.Literal:
                case Syntax.LogicalExpression:
                case Syntax.MemberExpression:
                case Syntax.NewExpression:
                case Syntax.ObjectExpression:
                case Syntax.ObjectPattern:
                case Syntax.Property:
                case Syntax.SequenceExpression:
                case Syntax.ThisExpression:
                case Syntax.UnaryExpression:
                case Syntax.UpdateExpression:
                case Syntax.YieldExpression:
                    return expression.call(this, node, parent, ctx);

                default:
                    throw new Error('Unknown node type: ' + node.type);
            }
        },

        /**
         *
         * @param {Object} functionAST
         * @param {Array.<TypeInfo> params
         * @param {Context} parentContext
         * @returns {*}
         */
        inferFunction: function (functionAST, params, parentContext) {
            var functionName = functionAST.id.name;
            var targetContextName = parentContext.getVariableIdentifier(functionName);
            this.injections[targetContextName] = params;

            // We have a specifc type set in params that we annotate to the
            // function AST
            for(var i = 0; i < params.length; i++) {
                if (i == functionAST.params.length)
                    break;
                var funcParam = new Annotation(functionAST.params[i]);
                funcParam.setFromExtra(params[i].getExtra());
            }

            var oldEntryPoint = this.entryPoint;
            this.entryPoint = targetContextName;
            this.pushContext(parentContext);
            //console.log("Starting to traverse: " + functionName + " in context " + parentContext.str())
            var ast = this.traverse(functionAST);
            this.popContext();
            this.entryPoint = oldEntryPoint;

            return ast;
        },

        inferProgram: function(prg, params) {
            var params = params || {};
            var programContext = registerGlobalContext(prg);

            this.pushContext(programContext);
            this.buildFunctionMap(prg);
            this.traverse(prg);
            this.popContext();

            var entryPoint = this.entryPoint;
            if (this.functions.orig.hasOwnProperty(entryPoint)) {
                var ast = this.functions.orig[entryPoint];
                var params = this.annotateParameters(params[entryPoint]);
                var aast = this.inferFunction(ast, params, programContext);
                for(var func in this.functions.derived) {
                    var variations = this.functions.derived[func];
                    for (var signature in variations) {
                        prg.body.push(variations[signature].ast);
                    }

                }
                prg.body.push(aast);

            }

            if (this.context.length)
                throw Error("Something went wrong");
            return prg;
        },
        getFunctionInformationFor: function(name, args, definingContext) {
            var signature = args.reduce(function(str, arg) { return str + arg.getTypeString()}, "");
            if (this.functions.derived.hasOwnProperty(name)) {
                var derivedFunction = this.functions.derived[name];
                if (derivedFunction.hasOwnProperty(signature)) {
                    return derivedFunction[signature].info;
                }
            }
            if (this.functions.orig.hasOwnProperty(name)) {
                var ast = this.functions.orig[name];
                var variations = this.functions.derived[name] = this.functions.derived[name] || {};
                var derived = variations[signature] = {};
                derived.ast = this.inferFunction(JSON.parse(JSON.stringify(ast)), args, definingContext);
                derived.info = derived.ast.extra.returnInfo;
                derived.info.newName = name.replace(/\./g, '_') + Object.keys(variations).length;
                derived.ast.id.name = derived.info.newName;
                return derived.info;
            }
            throw new Error("Could not resolve function " + name);
        }

    });


    ns.infer = function (ast, opt) {
        var ti = new TypeInference(ast, opt);
        return ti.inferProgram(ti.root, opt.inject);
    };


}(exports));

},{"../../base/index.js":21,"./../../base/annotation.js":19,"./../../base/context.js":20,"./infer_expression.js":6,"./infer_statement.js":7,"./registry/index.js":9,"estraverse":4}],19:[function(require,module,exports){
(function(ns){

    var Shade = require("../interfaces.js"),
        Syntax = require('estraverse').Syntax,
        Base = require("./index.js"),
        TypeInfo = require("./typeinfo.js").TypeInfo;

    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;


    /**
     * @param {object} node
     * @param {object} extra
     * @extends TypeInfo
     * @constructor
     */
    var Annotation = function (node, extra) {
        TypeInfo.call(this, node, extra);
    };

    Base.createClass(Annotation, TypeInfo, {

        setCall : function(call) {
            var extra = this.getExtra();
            extra.evaluate = call;
        },
        getCall : function() {
            return this.getExtra().evaluate;
        },
        clearCall: function() {
            var extra = this.getExtra();
            delete extra.evaluate;
        },
        eliminate : function() {
            var extra = this.getExtra();
            extra.eliminate = true;
        },
        canEliminate : function() {
            var extra = this.getExtra();
            return extra.eliminate == true;
        }

    });

    /**
     * @param {Array.<object>} arr Array of nodes
     * @param {Context} ctx
     * @returns {Array.<Annotation>}
     */
    Annotation.createAnnotatedNodeArray = function(arr, ctx) {
        return arr.map(function (arg) {
            return ctx.createTypeInfo(arg);
        });
    }


    /**
     * @param {object} node
     * @param {object} extra
     * @extends Annotation
     * @constructor
     */
    var FunctionAnnotation = function (node, extra) {
        Annotation.call(this, node, extra);
        this.setType(TYPES.FUNCTION);
    };

    Base.createClass(FunctionAnnotation, Annotation, {
        getReturnInfo: function() {
            return this.getExtra().returnInfo;
        },
        setReturnInfo: function(info) {
            this.getExtra().returnInfo = info;
        },
        isUsed: function() {
            return !!this.getExtra().used;
        },
        setUsed: function(v) {
            this.getExtra().used = v;
        }
    });

    ns.Annotation = Annotation;
    ns.FunctionAnnotation = FunctionAnnotation;
    ns.ANNO = function(object){return new Annotation(object)};

}(exports));

},{"../interfaces.js":36,"./index.js":21,"./typeinfo.js":22,"estraverse":4}],20:[function(require,module,exports){
(function(ns){

    var Base = require("./index.js"),
        Shade = require("../interfaces.js"),
        TYPES = Shade.TYPES,
        Annotation = require("./annotation.js").Annotation,
        TypeInfo = require("./typeinfo.js").TypeInfo,
        Syntax = require('estraverse').Syntax;

    ns.getContext = function(registry) {

    /**
     *
     * @param binding
     * @extends TypeInfo
     * @constructor
     */
    var Binding = function(binding, registery) {
        TypeInfo.call(this, binding);
        if(this.node.ref) {
            if (!registery[this.node.ref])
                throw Error("No object has been registered for: " + this.node.ref);
            this.globalObject = registery[this.node.ref].object;
            if (this.globalObject) {
                this.setType(TYPES.OBJECT);
            }
        }
    };


    Base.createClass(Binding, TypeInfo, {
        hasConstructor: function() {
            return !!this.getConstructor();
        },
        getConstructor: function() {
            return this.globalObject && this.globalObject.constructor;
        },
        isInitialized: function() {
            return this.node.initialized;
        },
        setInitialized: function(v) {
            this.node.initialized = v;
        },
        hasStaticValue: function() {
            return false;
        },
        isGlobal: function() {
            return this.node.info && this.node.info._global || TypeInfo.prototype.isGlobal.call(this);
        },
        getType: function() {
            return this.globalObject? TYPES.OBJECT : TypeInfo.prototype.getType.call(this);
        },
        getObjectInfo: function() {
            if (this.globalObject)
                return this.globalObject.static;
            if (this.isObject()) {
                return this.node.info || registry.getInstanceForKind(this.getKind());
            }
            return null;
        },
        getInfoForSignature: function(signature) {
            var extra = this.getExtra();
            if(!extra.signatures)
                return null;
            return extra.signatures[signature];
        },
        setInfoForSignature: function(signature, info) {
            var extra = this.getExtra();
            if(!extra.signatures)
                extra.signatures = {};
            return extra.signatures[signature] = info;
        }


    })


    /**
     * @param {Context|null} parent
     * @param opt
     * @constructor
     */
    var Context = function(node, parent, opt) {
        opt = opt || {};

        /** @type (Context|null) */
        this.parent = parent || opt.parent || null;
        this.registery = parent ? parent.registery : {};

        this.context = node.context = node.context || {};

        /** @type {Object.<string, {initialized: boolean, annotation: Annotation}>} */
        this.context.bindings = this.context.bindings || {};
        if(opt.bindings) {
            Base.extend(this.context.bindings, opt.bindings);
        }

        this.context.name = opt.name || node.name || "<anonymous>";

    };

    Base.extend(Context.prototype, {

        getName: function() {
            return this.context.name;
        },

        getBindings: function() {
            return this.context.bindings;
        },

        updateReturnInfo: function(annotation) {
            this.context.returnInfo = annotation.getExtra();
        },
        getReturnInfo: function() {
            return this.context.returnInfo;
        },

        /**
         * @param {string} name
         * @returns {*}
         */
        getBindingByName: function(name) {
            var bindings = this.getBindings();
            var binding = bindings[name];
            if(binding !== undefined)
                return new Binding(binding, this.registery);
            if (this.parent)
                return this.parent.getBindingByName(name);
            return undefined;
        },

        /**
         * @param {string} name
         * @returns {Context|null}
         */
        getContextForName: function(name) {
            var bindings = this.getBindings();
            if(bindings[name] !== undefined)
                return this;
            if (this.parent)
                return this.parent.getContextForName(name);
            return null;
        },

        getVariableIdentifier: function(name) {
            var context = this.getContextForName(name);
            if(!context)
                return null;
            return context.str() + "." + name;
        },

        declareVariable: function(name, fail, position) {
            var bindings = this.getBindings();
            fail = (fail == undefined) ? true : fail;
            if (bindings[name]) {
                if (fail) {
                    throw new Error(name + " was already declared in this scope.")
                } else {
                    return false;
                }
            }

            var init = {
                initialized : false,
                initPosition: position,
                extra: {
                    type: TYPES.UNDEFINED
                }
            };
            bindings[name] = init;
            return true;
        },

        /**
         *
         * @param {string} name
         * @param {TypeInfo} typeInfo
         */
        updateExpression: function (name, typeInfo) {
            var v = this.getBindingByName(name);
            if (!v) {
                throw new Error("Variable was not declared in this scope: " + name);
            }
            if (v.isInitialized() && v.getType() !== typeInfo.getType()) {
                throw new Error("Variable may not change it's type: " + name);
            }
            if (!v.isInitialized()) {
                // Annotate the declaration, if one is given
                if(v.node.initPosition)
                    v.node.initPosition.copy(typeInfo);
            }

            v.copy(typeInfo);
            v.setDynamicValue();
            v.setInitialized(!typeInfo.isUndefined());
        },

        registerObject: function(name, obj) {
            this.registery[obj.id] = obj;
            var bindings = this.getBindings();
            bindings[name] = {
                extra: {
                    type: TYPES.OBJECT
                },
                ref: obj.id
            };
        },

        declareParameters: function(params) {
            var bindings = this.getBindings();
            this.params = [];
            for(var i = 0; i < params.length; i++) {
                var parameter = params[i];
                this.params[i] = parameter.name;
                bindings[parameter.name] = { type: TYPES.UNDEFINED };
            }
        },

        /**
         *
         * @param {Array.<TypeInfo>} <params
         */
        injectParameters: function(params) {
            for(var i = 0; i< params.length; i++) {
                if (i == this.params.length)
                    break;
                var name = this.params[i];
                var bindings = this.getBindings();
                bindings[name] = { extra: {} };
                Base.deepExtend(bindings[name].extra, params[i].getExtra());
                if (params[i].getNodeInfo()) {
                    bindings[name].info = {};
                    Base.deepExtend(bindings[name].info, params[i].getNodeInfo());
                }
            }
        },

        str: function() {
            var ctx = this;
            var names = [];
            while(ctx) {
                names.unshift(ctx.getName());
                ctx = ctx.parent;
            }
            return names.join(".");
        },

        getAllBindings: function() {
            var result = Object.keys(this.getBindings());
            if (this.parent) {
                var parentBindings = this.parent.getAllBindings();
                for(var i = 0; i < parentBindings.length; i++) {
                    if (result.indexOf(parentBindings[i]) !== -1) {
                        result.push(parentBindings[i]);
                    }
                }
            }
            return result;
        },

        /**
         *
         * @param node
         * @returns {TypeInfo}
         */
        createTypeInfo: function (node) {
            var result = new Annotation(node);
            if (result.getType() !== TYPES.ANY) {
                return result;
            }

            if (node.type == Syntax.Identifier) {
                var name = node.name;
                var binding = this.getBindingByName(name);
                if (!binding) {
                    Shade.throwError(node, "ReferenceError: " + name + " is not defined");
                }
                return binding;
            }
            return result;
        },

        getObjectInfoFor: function(obj) {
            if (!obj.isObject())
                return null;

            /* The TypeInfo might know about it's object type */
            if (obj.getObjectInfo) {
                return obj.getObjectInfo();
            };

            var nodeInfo = obj.getNodeInfo();
            if (nodeInfo) {
                console.error("Found NodeInfo");
                return nodeInfo;
            }
            return registry.getInstanceForKind(obj.getKind())
        }

    });


        return Context;

    };



}(exports));

},{"../interfaces.js":36,"./annotation.js":19,"./index.js":21,"./typeinfo.js":22,"estraverse":4}],21:[function(require,module,exports){
(function(ns){

    ns.extend = function(a, b) {
        for ( var prop in b) {
            var g = b.__lookupGetter__(prop), s = b.__lookupSetter__(prop);
            if (g||s) {
                if (g) {
                    a.__defineGetter__(prop, g);
                }
                if (s) {
                    a.__defineSetter__(prop, s);
                }
            } else {
                if (b[prop] === undefined) {
                    delete a[prop];
                } else if (prop !== "constructor" || a !== window) {
                    a[prop] = b[prop];
                }
            }
        }
        return a;
    };

    ns.deepExtend = function(destination, source) {
        for (var property in source) {
            if (typeof source[property] === "object" && source[property] !== null) {
                destination[property] = destination[property] || {};
                ns.deepExtend(destination[property], source[property]);
            } else {
                destination[property] = source[property];
            }
        }
    };

    /**
     *
     * @param {Object} ctor Constructor
     * @param {Object} parent Parent class
     * @param {Object=} methods Methods to add to the class
     * @return {Object!}
     */
    ns.createClass = function(ctor, parent, methods) {
        methods = methods || {};
        if (parent) {
            /** @constructor */
            var F = function() {
            };
            F.prototype = parent.prototype;
            ctor.prototype = new F();
            ctor.prototype.constructor = ctor;
            ctor.superclass = parent.prototype;
        }
        for ( var m in methods) {
            ctor.prototype[m] = methods[m];
        }
        return ctor;
    };


}(exports))

},{}],22:[function(require,module,exports){
(function(ns){

    var Shade = require("../interfaces.js"),
        Syntax = require('estraverse').Syntax,
        Base = require("./index.js");

    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;


    /**
     * @param {*} node Carrier object for the type info, only node.extra gets polluted
     * @param {Object?} extra
     * @constructor
     */
    var TypeInfo = function (node, extra) {
        this.node = node;
        this.node.extra = this.node.extra || {};
        if (extra) {
            Base.deepExtend(this.node.extra, extra);
        }
    }

    TypeInfo.createForContext = function(node, ctx) {
        var result = new TypeInfo(node);
        if (result.getType() !== TYPES.ANY) {
            return result;
        }

        if (node.type == Syntax.Identifier) {
            var name = node.name;
            var variable = ctx.getBindingByName(name);
            return new TypeInfo(node, variable);
        }
        return result;
    }

    TypeInfo.prototype = {
        getExtra: function () {
            return this.node.extra;
        },
        getType: function () {
            var extra = this.getExtra();
            if (extra.type != undefined)
                return extra.type;
            return TYPES.ANY;
        },

        setKind: function (kind) {
            var extra = this.getExtra();
            extra.kind = kind;
        },

        getKind: function () {
            if (!this.isObject())
                return null;
            return this.getExtra().kind || KINDS.ANY;
        },

        getArrayElementType: function () {
            if(!this.isArray())
                throw new Error("Called getArrayElementType on " + this.getType());
            return this.getExtra().elements;
        },

        isOfKind: function(kind) {
            if (!this.isObject()) {
                return false;
            }
            return this.getKind() == kind;
        },

        /**
         * @param {string} type
         * @param {string?} kind
         */
        setType: function (type, kind) {
            var extra = this.getExtra();
            extra.type = type;
            if (kind)
                this.setKind(kind);
        },

        isOfType: function (type) {
            return this.getType() == type;
        },

        equals: function (other) {
            return this.getType() == other.getType() && this.getKind() == other.getKind();
        },

        isInt: function () {
            return this.isOfType(TYPES.INT);
        },
        isNumber: function () {
            return this.isOfType(TYPES.NUMBER);
        },
        isNullOrUndefined: function () {
            return this.isNull() || this.isUndefined();
        },
        isNull: function () {
            return this.isOfType(TYPES.NULL);
        },
        isUndefined: function () {
            return this.isOfType(TYPES.UNDEFINED);
        },
        isBool: function () {
            return this.isOfType(TYPES.BOOLEAN);
        },
        isString: function () {
            return this.isOfType(TYPES.STRING);
        },
        isArray: function () {
            return this.isOfType(TYPES.ARRAY);
        },
        isFunction: function () {
            return this.isOfType(TYPES.FUNCTION);
        },
        isObject: function () {
            return this.isOfType(TYPES.OBJECT);
        },
        isGlobal: function() {
            return !!this.getExtra().global;
        },
        setGlobal: function (global) {
            var extra = this.getExtra();
            extra.global = global;
        },
        canNumber: function () {
            return this.isNumber() || this.isInt() || this.isBool();
        },
        canInt: function () {
            return this.isInt() || this.isBool();
        },
        hasStaticValue : function() {
            var extra = this.getExtra();
            if (this.isNullOrUndefined())
                return true;
            return extra.hasOwnProperty("staticValue");
        },
        setStaticValue : function(v) {
            var extra = this.getExtra();
            if (this.isNullOrUndefined())
                throw("Null and undefined have predefined values.");
            extra.staticValue = v;
        },
        getStaticValue : function() {
            if (!this.hasStaticValue()) {
                throw new Error("Node has no static value: " + this.node);
            }
            if (this.isNull())
                return null;
            if (this.isUndefined())
                return undefined;
            return this.getExtra().staticValue;
        },
        setDynamicValue : function() {
            delete this.getExtra().staticValue;
        },
        setCall : function(call) {
            var extra = this.getExtra();
            extra.evaluate = call;
        },
        getCall : function() {
            return this.getExtra().evaluate;
        },
        clearCall: function() {
            var extra = this.getExtra();
            delete extra.evaluate;
        },
        copy: function(other) {
            Base.deepExtend(this.node.extra, other.getExtra());
        },
        str: function() {
            var extra = this.getExtra();
            return JSON.stringify(extra, null, 1);
        },
        canNormal: function() {
            return this.isObject() && (this.isOfKind(KINDS.NORMAL) || this.isOfKind(KINDS.FLOAT3));
        },
        canColor: function() {
            return this.isObject() && (this.isOfKind(KINDS.FLOAT4) || this.isOfKind(KINDS.FLOAT3));
        },
        eliminate : function() {
            var extra = this.getExtra();
            extra.eliminate = true;
        },
        canEliminate : function() {
            var extra = this.getExtra();
            return extra.eliminate == true;
        },
        setFromExtra: function(extra){
            this.setType(extra.type);
            if (extra.kind != undefined)
                this.setKind(extra.kind);
            this.setGlobal(extra.global);
            if (extra.staticValue != undefined)
                this.setStaticValue(extra.staticValue);
            if (extra.evaluate != undefined)
                this.setCall(extra.evaluate);
            if (extra.source != undefined)
                this.setSource(extra.source);
        },
        getNodeInfo: function() {
            if (this.isObject())
                return this.node.info;
        },
        getTypeString: function() {
            if (this.isObject())
                return "Object #<" + this.getKind() + ">";
            return this.getType();
        },
        setSource: function(source) {
            var extra = this.getExtra();
            extra.source = source;
        },
        getSource: function() {
            return this.getExtra().source;
        }

    }

    ns.TypeInfo = TypeInfo;

}(exports));

},{"../interfaces.js":36,"./index.js":21,"estraverse":4}],23:[function(require,module,exports){
(function(ns){

    ns.swizzleToIndex = function(swizzleKey){
        switch(swizzleKey){
            case 'x':case 'r' :case 's': return 0;
            case 'y':case 'g' :case 't': return 1;
            case 'z':case 'b' :case 'p': return 2;
            case 'w':case 'a' :case 'q': return 3;
        }
        throw new Error("Unknown swizzle key: '" + swizzleKey + "'");
    };
    ns.indexToSwizzle = function(index){
        switch(index){
            case 0: return 'x';
            case 1: return 'y';
            case 2: return 'z';
            case 3: return 'w';
        }
        throw new Error("Unknown swizzle index: '" + index + "'");
    };
    ns.swizzleSets = [
        ['x', 'y', 'z', 'w'],
        ['r', 'g', 'b', 'a'],
        ['s', 't', 'p', 'q']
    ];

}(exports))

},{}],24:[function(require,module,exports){
(function (ns) {

    var Base = require("../../base/index.js");

    var Transformer = require("./transform.js").GLASTTransformer;
    var generate = require("./glsl-generate.js").generate;

    var GLSLCompiler = function () {

    };

    Base.extend(GLSLCompiler.prototype, {

        compileFragmentShader: function (aast, opt) {

            var transformer = new Transformer("global.shade");

            //console.log(JSON.stringify(aast, 0, " "));

            var transformed = transformer.transformAAST(aast);

            //console.log(JSON.stringify(aast, 0, " "));

            var code = generate(transformed, opt);

            return code;
        }

    });


    ns.GLSLCompiler = GLSLCompiler;

}(exports));

},{"../../base/index.js":21,"./glsl-generate.js":25,"./transform.js":35}],25:[function(require,module,exports){
(function (ns) {

    var FunctionAnnotation = require("./../../base/annotation.js").FunctionAnnotation;
    var Shade = require("./../../interfaces.js");
    var walk = require('estraverse'),
        Syntax = walk.Syntax,
        VisitorOption = walk.VisitorOption;

    var Types = Shade.TYPES,
        Kinds = Shade.OBJECT_KINDS,
        Sources = Shade.SOURCES;



    /**
     * @param {object} opt
     */
    var getHeader = function (opt) {
        if (opt.omitHeader == true)
            return [];
        var header = [
            "// Generated by shade.js"
        ];
        var floatPrecision = opt.floatPrecision || "mediump";
        header.push("precision " + floatPrecision + " float;");
        return header;
    }

    var toGLSLType = function (info, allowUndefined) {
        switch (info.type) {
            case Types.OBJECT:
                switch (info.kind) {
                    case Kinds.FLOAT4:
                        return "vec4";
                    case Kinds.FLOAT3:
                        return "vec3";
                    case Kinds.FLOAT2:
                        return "vec2";
                    default:
                        return "<undefined>";
                }
            case Types.UNDEFINED:
                if (allowUndefined)
                    return "void";
                throw new Error("Could not determine type");
            case Types.NUMBER:
                return "float";
            case Types.BOOLEAN:
                return "bool";
            case Types.INT:
                return "int";
            case Types.BOOLEAN:
                return "bool";
            default:
                throw new Error("toGLSLType: Unhandled type: " + info.type);

        }
    }

    var toGLSLSource = function(info) {
        if (!info.source)
            return "";
        if (info.source == Sources.VERTEX)
            return "varying";
        if (info.source == Sources.UNIFORM)
            return "uniform";
        if (info.source == Sources.CONSTANT)
            return "const";
        throw new Error("toGLSLSource: Unhandled type: " + info.source);
    }

    function createLineStack() {
        var arr = [];
        arr.push.apply(arr, arguments);
        var indent = "";
        arr.appendLine = function(line){
            this.push(indent + line);
        };
        arr.changeIndention = function(add){
            while(add > 0){
                indent += "    "; add--;
            }
            if(add < 0){
                indent = indent.substr(0, indent.length + add*4);
            }
        };
        arr.append = function(str){
            this[this.length-1] = this[this.length-1] + str;
        };
        return arr;
    };


    /*Base.extend(LineStack.prototype, {

    });*/

    var generate = function (ast, opt) {

        opt = opt || {};

        var indent = "";
        var lines = createLineStack();

        traverse(ast, lines, opt);

        return lines.join("\n");
    }

    function traverse(ast, lines, opt) {
        walk.traverse(ast, {
                enter: function (node) {
                    try {
                        var type = node.type;
                        switch (type) {

                            case Syntax.Program:
                                getHeader(opt).forEach(function (e) {
                                    lines.push(e)
                                });
                                break;


                            case Syntax.FunctionDeclaration:
                                var func = new FunctionAnnotation(node);
                                var methodStart = [toGLSLType(func.getReturnInfo(), true)];
                                methodStart.push(node.id.name, '(');
                                if (!(node.params && node.params.length)) {
                                    methodStart.push("void");
                                } else {
                                    node.params.forEach(function (param) {
                                        methodStart.push(toGLSLType(param.extra), param.name);
                                    })
                                }
                                methodStart.push(') {');
                                lines.appendLine(methodStart.join(" "));
                                lines.changeIndention(1);
                                return;


                            case Syntax.ReturnStatement:
                                var hasArguments = node.argument;
                                lines.appendLine("return " + (hasArguments ? handleExpression(node.argument) : "") + ";");
                                return;

                            case Syntax.VariableDeclarator :
                                // console.log("Meep!");
                                var source = toGLSLSource(node.extra);
                                var line = source ? source + " " : "";
                                line += toGLSLType(node.extra) + " " + node.id.name;
                                if (node.init) line += " = " + handleExpression(node.init);
                                lines.appendLine(line + ";");
                                return;

                            case Syntax.AssignmentExpression:
                                lines.appendLine(handleExpression(node) + ";")
                                return;

                            case Syntax.ExpressionStatement:
                                lines.appendLine(handleExpression(node.expression) + ";");
                                return VisitorOption.Skip;

                            case Syntax.IfStatement:
                                lines.appendLine("if(" + handleExpression(node.test) + ") {");

                                lines.changeIndention(1);
                                traverse(node.consequent, lines, opt);
                                lines.changeIndention(-1);

                                if (node.alternate) {
                                    lines.appendLine("} else {");
                                    lines.changeIndention(1);
                                    traverse(node.alternate, lines, opt);
                                    lines.changeIndention(-1);
                                }
                                lines.appendLine("}");
                                return VisitorOption.Skip;


                            default:
                            //console.log("Unhandled: " + type);

                        }
                    } catch (e) {
                        Shade.throwError(node, e.message);
                    }
                },
                leave: function (node) {
                    var type = node.type;
                    switch (type) {
                        case Syntax.Program:
                            break;
                        case Syntax.FunctionDeclaration:
                            lines.changeIndention(-1);
                            lines.appendLine("}");
                            break;
                    }
                }
            }
        );
    }

    var generateFloat = function(value) {
        if(isNaN(value))
            throw Error("Internal: Expression generated NaN!");
        var result = '' + value;
        if (result.indexOf(".") == -1) {
            result += ".0";
        }
        return result;
    }

    /**
     *
     * @param node
     * @returns {string}
     */
    var handleExpression = function(node) {
        var result = "<unhandled: " + node.type+ ">";
        switch(node.type) {
            case Syntax.NewExpression:
                result = toGLSLType(node.extra);
                result += handleArguments(node.arguments);
                break;

            case Syntax.Literal:
                var value = node.extra.staticValue !== undefined ? node.extra.staticValue : node.value;
                if (node.extra.type == Types.NUMBER)
                    result = generateFloat(value);
                else
                    result = value;
                break;


            case Syntax.Identifier:
                result = node.name;
                break;

            case Syntax.BinaryExpression:
            case Syntax.LogicalExpression:
            case Syntax.AssignmentExpression:
                result = handleBinaryArgument(node.left);
                result += " " + node.operator + " ";
                result += handleBinaryArgument(node.right);
                break;
            case Syntax.UnaryExpression:
                result = node.operator;
                result += handleBinaryArgument(node.argument);
                break;

            case Syntax.CallExpression:
                result = handleExpression(node.callee);
                result += handleArguments(node.arguments);
                break;

            case Syntax.MemberExpression:
                result = handleExpression(node.object);
                result += ".";
                result += handleExpression(node.property);
                break;

            case Syntax.ConditionalExpression:
                result = handleExpression(node.test);
                result += " ? ";
                result += handleExpression(node.consequent);
                result += " : ";
                result += handleExpression(node.alternate);
                break;

            default:
                //console.log("Unhandled: " , node.type);
        }
        return result;
    }

    function handleBinaryArgument(node){
        var result = handleExpression(node);
        switch(node.type) {
            case Syntax.BinaryExpression:
            case Syntax.LogicalExpression:
            case Syntax.AssignmentExpression: result = "( " + result + " )"; break;
        }
        return result;
    }

    function handleArguments(container) {
        var result = "(";
        container.forEach(function (arg, index) {
            result += handleExpression(arg);
            if (index < container.length - 1) {
                result += ", ";
            }
        });
        return result + ")";
    }


    exports.generate = generate;


}(exports));

},{"./../../base/annotation.js":19,"./../../interfaces.js":36,"estraverse":4}],26:[function(require,module,exports){
(function(ns){

    var Shade = require("../../../interfaces.js");
    var Tools = require("./tools.js");

    var ColorClosureInstance = {

    };

    Tools.extend(ns, {
        id: "ColorClosure",
        kind: Shade.OBJECT_KINDS.COLOR_CLOSURE,
        object: {
            constructor: null,
            static: {}
        },
        instance: ColorClosureInstance
    });
}(exports));

},{"../../../interfaces.js":36,"./tools.js":31}],27:[function(require,module,exports){
(function(ns) {

    var objects = {
        //Color : require("./color.js"),
        Shade : require("./shade.js"),
        //Matrix4 : require("./matrix.js"),
        Math : require("./math.js"),
        System : require("./system.js"),
        Vec2 : require("./vec2.js"),
        Vec3 : require("./vec3.js"),
        Color: require("./vec3.js"),
        Vec4 : require("./vec4.js"),
        ColorClosure: require("./colorclosure.js")
    };

    ns.Registry = {
        name: "GLSLTransformRegistry",
        getByName: function(name) {
            var result = objects[name];
            return result || null;
        },
        getInstanceForKind: function(kind) {
            for(var obj in objects) {
                if (objects[obj].kind == kind) {
                    return objects[obj].instance;
                }
            }
            return null;
        }
    }


}(exports));

},{"./colorclosure.js":26,"./math.js":28,"./shade.js":29,"./system.js":30,"./vec2.js":32,"./vec3.js":33,"./vec4.js":34}],28:[function(require,module,exports){
(function(ns){

   var Shade = require("../../../interfaces.js");
   var Syntax = require('estraverse').Syntax;
   var Tools = require('./tools.js');

    var MathConstants = ["E", "PI", "LN2", "LOG2E", "LOG10E", "PI", "SQRT1_2", "SQRT2"];



    var handleIntVersion = function(node, parent) {
        parent.extra.type = Shade.TYPES.NUMBER;
        return Tools.removeMemberFromExpression(node);
    }


    var MathEntry  = {
        abs: { property: Tools.removeMemberFromExpression },
        acos: { property: Tools.removeMemberFromExpression },
        asin: { property: Tools.removeMemberFromExpression },
        atan: { property: Tools.removeMemberFromExpression },
        atan2: { property: function() { return { type: Syntax.Identifier, name: "atan" } }},
        ceil: { property: handleIntVersion },
        cos:  { property: Tools.removeMemberFromExpression },
        exp: { property: Tools.removeMemberFromExpression },
        floor: { property: handleIntVersion },
        // imul: { property: Tools.removeMemberFromExpression },
        log: { property: Tools.removeMemberFromExpression },
        max: { property: Tools.removeMemberFromExpression },
        min: { property: Tools.removeMemberFromExpression },
        pow: { property: Tools.removeMemberFromExpression },
        // random: function random() { [native code] }
        round: { property: Tools.removeMemberFromExpression }, // Since GLSL 1.3, what does WebGL use?
        sin:  { property: Tools.removeMemberFromExpression },
        sqrt: { property: Tools.removeMemberFromExpression },
        tan: { property: Tools.removeMemberFromExpression }
    };

    MathConstants.forEach(function (constant) {
        MathEntry[constant] = {
            property: function () {
                return  { type: Syntax.Literal, value: Math[constant], extra: { type: Shade.TYPES.NUMBER } };
            }
        }
    });

    Tools.extend(ns, {
        id: "Math",
        object: {
            constructor: null,
            static: MathEntry
        },
        instance: MathEntry
    });

}(exports));

},{"../../../interfaces.js":36,"./tools.js":31,"estraverse":4}],29:[function(require,module,exports){
(function(ns){

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require('./tools.js');

    var ShadeObject = {
        diffuse: {},
        phong: {},
        fract: { property: Tools.removeMemberFromExpression },
        clamp: { property: Tools.removeMemberFromExpression },
        step: { property: Tools.removeMemberFromExpression },
        smoothstep: { property: Tools.removeMemberFromExpression }
    }

    Tools.extend(ns, {
    id: "Shade",
    object: {
        constructor: null,
        static: ShadeObject
    },
    instance: null
});

}(exports));

},{"../../../interfaces.js":36,"./tools.js":31,"estraverse":4}],30:[function(require,module,exports){
(function (ns) {

    var Base = require("../../../base/index.js"),
        Shade = require("../../../interfaces.js");

    var SystemParameterNames = {
        "normalizedCoords" : "_sys_normalizedCoords",
        "height": "_sys_height",
        "width": "_sys_width"
    }

    var SystemEntry = {
        coords: {
            property: function (node) {
                node.property.name = "gl_FragCoord";
                return node.property;
            }
        },
        normalizedCoords: {
            property: function (node, parent, context, state) {
                state.globalParameters[SystemParameterNames.normalizedCoords] = {
                    type: Shade.TYPES.OBJECT,
                    kind: Shade.OBJECT_KINDS.FLOAT3,
                    source: Shade.SOURCES.UNIFORM
                }
                node.property.name = SystemParameterNames.normalizedCoords;
                return node.property;
            }
        },
        height: {
            property: function (node, parent, context, state) {
                state.globalParameters[SystemParameterNames.height] = {
                    type: Shade.TYPES.NUMBER,
                    source: Shade.SOURCES.UNIFORM
                }
                node.property.name = SystemParameterNames.height;
                return node.property;
            }
        },
        width: {
            property: function (node, parent, context, state) {
                state.globalParameters[SystemParameterNames.width] = {
                    type: Shade.TYPES.NUMBER,
                    source: Shade.SOURCES.UNIFORM
                }
                node.property.name = SystemParameterNames.width;
                return node.property;
            }
        }

    };

    Base.extend(ns, {
        id: "System",
        object: {
            constructor: null,
            static: SystemEntry
        },
        instance: null
    });
}(exports));

},{"../../../base/index.js":21,"../../../interfaces.js":36}],31:[function(require,module,exports){
(function (ns) {

    var Syntax = require('estraverse').Syntax;
    var Base = require("../../../base/index.js");
    var ANNO = require("../../../base/annotation.js").ANNO;
    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        VecBase = require("../../../base/vec.js");


    ns.removeMemberFromExpression = function (node) {
        return {
            type: Syntax.Identifier,
            name: node.property.name
        }
    }

    var Vec = {
        generateVecFromArgs: function(vecCount, args){
            if(vecCount == 1)
                return args[0];
            if(args.length == 1 && ANNO(args[0]).isOfKind(KINDS['FLOAT' + vecCount]))
                return args[0];
            var result = {
                type: Syntax.NewExpression,
                callee: {
                    type: Syntax.Identifier,
                    name: "Vec" + vecCount
                },
                arguments: args
            };
            ANNO(result).setType(TYPES.OBJECT, KINDS['FLOAT' + vecCount]);
            ANNO(result.callee).setType(TYPES.FUNCTION);
            return result;
        },

        createSwizzle: function(vecCount, swizzle, node, args, parent){
            if (args.length == 0) {
                node.callee.extra = node.extra;
                return node.callee;
            }
            var singular = swizzle.length == 1;
            var argObject = singular ? node.arguments[0] : Vec.generateVecFromArgs(swizzle.length, node.arguments);
            var replace = {
                type: Syntax.NewExpression,
                callee: {
                   type: Syntax.Identifier,
                   name: "Vec" + vecCount
                },
                arguments: []
            };
            var indices = [];
            for(var i = 0; i < swizzle.length; ++i){
                var idx = VecBase.swizzleToIndex(swizzle.charAt(i));
                indices[idx] = i;
            }
            for(var i = 0; i < vecCount; ++i){
                if(indices[i] !== undefined){
                    replace.arguments[i] = singular ? argObject : {
                        type: Syntax.MemberExpression,
                        object: argObject,
                        property: {
                            type: Syntax.Identifier,
                            name: VecBase.indexToSwizzle(indices[i])
                        }
                    };
                }
                else{
                   replace.arguments[i] = {
                        type: Syntax.MemberExpression,
                        object: node.callee.object,
                        property: {
                            type: Syntax.Identifier,
                            name: VecBase.indexToSwizzle(i)
                        }
                    };
                }
            }
            ANNO(replace).copy(ANNO(node));
            return replace;
        },

        attachSwizzles: function (instance, vecCount){
            for(var s = 0; s < VecBase.swizzleSets.length; ++s){
                for(var count = 1; count <= 4; ++count){
                    var max = Math.pow(vecCount, count);
                     for(var i = 0; i < max; ++i){
                        var val = i;
                        var key = "";
                        for(var  j = 0; j < count; ++j){
                            var idx = val % vecCount;
                            val = Math.floor(val / vecCount);
                            key+= VecBase.swizzleSets[s][idx];
                        }
                        instance[key] = {
                            callExp: Vec.createSwizzle.bind(null, vecCount, key)
                        };
                    }
                }
            }
        },

        createOperator: function(vecCount, operator, node, args, parent) {
            var other = Vec.generateVecFromArgs(vecCount, node.arguments);
            var replace = {
                type: Syntax.BinaryExpression,
                operator: operator,
                left: node.callee.object,
                right: other
            };
            ANNO(replace).copy(ANNO(node));
            return replace;
        },

        attachOperators: function(instance, vecCount, operators){
            for(var name in operators){
                var operator = operators[name];
                instance[name] = {
                    callExp: Vec.createOperator.bind(null, vecCount, operator)
                }
            }
        },

        createFunctionCall: function(functionName, secondVecSize, node, args, parent) {
            var replace = {
                type: Syntax.CallExpression,
                callee: {
                    type: Syntax.Identifier,
                    name: functionName
                },
                arguments: [
                    node.callee.object
                ]
            };
            if(secondVecSize){
                var other = Vec.generateVecFromArgs(secondVecSize, node.arguments);
                replace.arguments.push(other);
            }
            ANNO(replace).copy(ANNO(node));
            return replace;
        },

        generateLengthCall: function(node, args, parent){
                if(args.length == 0){
                    return Vec.createFunctionCall('length', 0, node, args, parent);
                }
                else{
                     var replace = {
                        type: Syntax.BinaryExpression,
                        operator: '*',
                        left: node.callee.object,
                        right: {
                            type: Syntax.BinaryExpression,
                            operator: '/',
                            left: node.arguments[0],
                            right: Vec.createFunctionCall('length', 0, node, args, parent)
                        }
                    };
                    ANNO(replace.right).setType(TYPES.NUMBER);
                    ANNO(replace).copy(ANNO(node));
                    return replace;
                }
            }
    };
    ns.Vec = Vec;

    ns.extend = Base.extend;


}(exports));

},{"../../../base/annotation.js":19,"../../../base/index.js":21,"../../../base/vec.js":23,"../../../interfaces.js":36,"estraverse":4}],32:[function(require,module,exports){
(function(ns){

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require("./tools.js");
    var ANNO = require("../../../base/annotation.js").ANNO;

    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;

    var Vec2Instance = {
        normalize: {
            callExp: Tools.Vec.createFunctionCall.bind(null, 'normalize', 0)
        },
        dot: {
            callExp: Tools.Vec.createFunctionCall.bind(null, 'dot', 2)
        },
        length: {
            callExp: Tools.Vec.generateLengthCall
        }
    }
    Tools.Vec.attachSwizzles(Vec2Instance, 2);
    Tools.Vec.attachOperators(Vec2Instance, 2, {
        add: '+',
        sub: '-',
        mul: '*',
        div: '/',
        mod: '%'
    })


    Tools.extend(ns, {
        id: "Vec2",
        kind: KINDS.FLOAT2,
        object: {
            constructor: null,
            static: {}
        },
        instance: Vec2Instance
    });

}(exports));

},{"../../../base/annotation.js":19,"../../../interfaces.js":36,"./tools.js":31,"estraverse":4}],33:[function(require,module,exports){
(function(ns){

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require("./tools.js");
    var ANNO = require("../../../base/annotation.js").ANNO;

    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;

    var Vec3Instance = {
        normalize: {
            callExp: Tools.Vec.createFunctionCall.bind(null, 'normalize', 0)
        },
        dot: {
            callExp: Tools.Vec.createFunctionCall.bind(null, 'dot', 3)
        },
        length: {
            callExp: Tools.Vec.generateLengthCall
        }
    }
    Tools.Vec.attachSwizzles(Vec3Instance, 3);
    Tools.Vec.attachOperators(Vec3Instance, 3, {
        add: '+',
        sub: '-',
        mul: '*',
        div: '/',
        mod: '%'
    })


    Tools.extend(ns, {
        id: "Vec3",
        kind: KINDS.FLOAT3,
        object: {
            constructor: null,
            static: {}
        },
        instance: Vec3Instance
    });

}(exports));

},{"../../../base/annotation.js":19,"../../../interfaces.js":36,"./tools.js":31,"estraverse":4}],34:[function(require,module,exports){
(function(ns){

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require("./tools.js");
    var ANNO = require("../../../base/annotation.js").ANNO;

    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;

    var Vec4Instance = {
        normalize: {
            callExp: Tools.Vec.createFunctionCall.bind(null, 'normalize', 0)
        },
        dot: {
            callExp: Tools.Vec.createFunctionCall.bind(null, 'dot', 4)
        },
        length: {
            callExp: Tools.Vec.generateLengthCall
        }
    }
    Tools.Vec.attachSwizzles(Vec4Instance, 4);
    Tools.Vec.attachOperators(Vec4Instance, 4, {
        add: '+',
        sub: '-',
        mul: '*',
        div: '/',
        mod: '%'
    })


    Tools.extend(ns, {
        id: "Vec4",
        kind: KINDS.FLOAT4,
        object: {
            constructor: null,
            static: {}
        },
        instance: Vec4Instance
    });

}(exports));

},{"../../../base/annotation.js":19,"../../../interfaces.js":36,"./tools.js":31,"estraverse":4}],35:[function(require,module,exports){
(function (ns) {

    var Base = require("../../base/index.js"),
        Annotation = require("../../base/annotation.js").Annotation,
        FunctionAnnotation = require("../../base/annotation.js").FunctionAnnotation,
        TypeInfo = require("../../base/typeinfo.js").TypeInfo,
        Shade = require("./../../interfaces.js"),
        Types = Shade.TYPES,
        Kinds = Shade.OBJECT_KINDS,
        Sources = require("./../../interfaces.js").SOURCES;

    var ObjectRegistry = require("./registry/index.js").Registry,
        Context = require("../../base/context.js").getContext(ObjectRegistry);


    var walk = require('estraverse');
    var Syntax = walk.Syntax;


    /**
     * Transforms the JS AST to an AST representation convenient
     * for code generation
     * @constructor
     */
    var GLASTTransformer = function (mainId) {
        this.mainId = mainId;
    };

    Base.extend(GLASTTransformer.prototype, {
        registerGlobalContext : function (program) {
            var ctx = new Context(program, null, {name: "global"});
            ctx.registerObject("Math", ObjectRegistry.getByName("Math"));
            ctx.registerObject("this", ObjectRegistry.getByName("System"));
            ctx.registerObject("Shade", ObjectRegistry.getByName("Shade"));
            ctx.registerObject("Vec2", ObjectRegistry.getByName("Vec2"));
            ctx.registerObject("Vec3", ObjectRegistry.getByName("Vec3"));
            ctx.registerObject("Color", ObjectRegistry.getByName("Vec3"));
            ctx.declareVariable("gl_FragCoord", false);
            ctx.updateExpression("gl_FragCoord", new TypeInfo({
                extra: {
                    type: Types.OBJECT,
                    kind: Kinds.FLOAT3
                }
            }));
            ctx.declareVariable("_sys_normalizedCoords", false);
            ctx.updateExpression("_sys_normalizedCoords", new TypeInfo({
                extra: {
                    type: Types.OBJECT,
                    kind: Kinds.FLOAT3
                }
            }));

            return ctx;
        },
        transformAAST: function (program) {
            this.root = program;
            var context = this.registerGlobalContext(program);

            var state = {
                 context: context,
                 contextStack: [context],
                 inMain:  this.mainId == context.str(),
                 globalParameters : program.injections[this.mainId] && program.injections[this.mainId][0] ? program.injections[this.mainId][0].node.info : {},
                 blockedNames : [],
                 topDeclarations : [],
                 idNameMap : {}
            }



            for(var name in state.globalParameters){
                state.blockedNames.push(name);
            }

            this.replace(program, state);

            for(var name in state.globalParameters){
                if(name !== "_global")
                    var decl = handleTopDeclaration(name, state.globalParameters);
                    if (decl)
                        program.body.unshift(decl);
            }

            return program;
        },
        /**
         *
         * @param {Object!} ast
         * @param {Object!} state
         * @returns {*}
         */
        replace: function(ast, state) {
            walk.replace(ast, {

                enter: function (node, parent) {
                    //console.log("Enter:", node.type);
                    switch (node.type) {
                        case Syntax.Identifier:
                            return handleIdentifier(node, parent, state.blockedNames, state.idNameMap);
                        case Syntax.IfStatement:
                            return handleIfStatement(node);
                        case Syntax.ConditionalExpression:
                            return handleConditionalExpression(node, state, this);
                        case Syntax.LogicalExpression:
                            return handleLogicalExpression(node, this, state);
                        case Syntax.FunctionDeclaration:
                            // No need to declare, this has been annotated already
                            var parentContext = state.contextStack[state.contextStack.length - 1];
                            var context = new Context(node, parentContext, {name: node.id.name });
                            state.context = context;
                            state.contextStack.push(context);
                            state.inMain = this.mainId == context.str();
                            break;
                    }
                }.bind(this),

                leave: function(node, parent) {
                    switch(node.type) {
                        case Syntax.MemberExpression:
                            return handleMemberExpression(node, parent, state);
                        case Syntax.CallExpression:
                            return handleCallExpression(node, parent, state.topDeclarations, state.context);
                        case Syntax.FunctionDeclaration:
                            state.context = state.contextStack.pop();
                            state.inMain = state.context.str() == this.mainId;
                            if (state.inMain)
                                return handleMainFunction(node, parent, state.context);
                        case Syntax.ReturnStatement:
                            if(state.inMain) {
                                return handleReturnInMain(node, parent);
                            }
                            break;
                        case Syntax.BinaryExpression:
                            return handleBinaryExpression(node, parent);

                    }
                }.bind(this)
            });
            return ast;
        }
    });

    var handleTopDeclaration = function(name, globalParameters){
        var propertyLiteral =  { type: Syntax.Identifier, name: getNameForGlobal(globalParameters, name)};
        var propertyAnnotation =  new Annotation(propertyLiteral);
        propertyAnnotation.setFromExtra(globalParameters[name]);

        if (propertyAnnotation.isNullOrUndefined())
            return;

        var decl = {
            type: Syntax.VariableDeclaration,
            declarations: [
                {
                    type: Syntax.VariableDeclarator,
                    id: propertyLiteral,
                    init: null
                }
            ],
            kind: "var"
        };
        var declAnnotation =  new Annotation(decl.declarations[0]);
        declAnnotation.copy(propertyAnnotation);
        return decl;
    }

    var handleIdentifier = function(node, parent, blockedNames, idNameMap){
        if(parent.type == Syntax.FunctionDeclaration)
            return node;
        var name = node.name;
        if(idNameMap[name]) node.name = idNameMap[name];
        var newName = name, i = 1;
        while(blockedNames.indexOf(newName) != -1){
            newName = name + "_" + (++i);
        }
        idNameMap[name] = newName;
        node.name = newName;
        return node;
    }


    var handleReturnInMain = function(node, parent) {
        if (node.argument) {
            return {
                type: Syntax.BlockStatement,
                body: [
                    {
                        type: Syntax.AssignmentExpression,
                        operator: "=",
                        left: {
                            type: Syntax.Identifier,
                            name: "gl_FragColor"
                        },
                        right: node.argument
                    },
                    {
                        type: Syntax.ReturnStatement
                    }
                ]
            }
        } else {
            return {
                type: Syntax.ExpressionStatement,
                expression : {
                    type: Syntax.Identifier,
                    name: "discard"
                }
            }
        }
    };

    var handleMainFunction = function(node, parent, context) {
        var anno = new FunctionAnnotation(node);
        anno.setReturnInfo({ type: Types.UNDEFINED });

        // console.log(context);
        // Main has no parameters
        node.params = [];
        // Rename to 'main'
        node.id.name = "main";
        //console.log(node);
    }


    function getNameOfNode(node) {
        switch (node.type) {
            case Syntax.Identifier:
                return node.name;
            case Syntax.MemberExpression:
                return getNameOfNode(node.object) + "." + getNameOfNode(node.property);
            case Syntax.NewExpression:
                return getNameOfNode(node.callee);
            default:
                return "unknown(" + node.type + ")";
        }
    };

    function getObjectReferenceFromNode(object, context) {
        switch (object.type) {
            case Syntax.NewExpression:
            case Syntax.CallExpression:
            case Syntax.MemberExpression:
            case Syntax.BinaryExpression:
                return context.createTypeInfo(object);
                break;
            case Syntax.Identifier:
                return context.getBindingByName(object.name);
                break;
            case Syntax.ThisExpression:
                return context.getBindingByName("this");
                break;
            default:
                throw new Error("Unhandled object type in GLSL generation: " + object.type);
        }
    }

    var handleCallExpression = function (callExpression, parent, topDeclarations, context) {

        // Is this a call on an object?
        if (callExpression.callee.type == Syntax.MemberExpression) {
            var calleeReference = getObjectReferenceFromNode(callExpression.callee, context);
            if(!(calleeReference && calleeReference.isFunction()))
                throw new Error("Something went wrong in type inference");

            var object = callExpression.callee.object,
                propertyName = callExpression.callee.property.name;

            var objectReference = getObjectReferenceFromNode(object, context);
            if(!objectReference)  {
                Shade.throwError(callExpression, "Internal: No object info for: " + object);
            }

            var objectInfo = context.getObjectInfoFor(objectReference);
            if(!objectInfo) { // Every object needs an info, otherwise we did something wrong
                Shade.throwError(callExpression, "Internal Error: No object registered for: " + objectReference.getTypeString() + ", " + getNameOfNode(callExpression.callee.object)+", "+callExpression.callee.object.type);
            }
            if (objectInfo.hasOwnProperty(propertyName)) {
                var propertyHandler = objectInfo[propertyName];
                if (typeof propertyHandler.callExp == "function") {
                    var args = Annotation.createAnnotatedNodeArray(callExpression.arguments, context);
                    return propertyHandler.callExp(callExpression, args, parent);
                }
            }

        }

    }


    var handleMemberExpression = function (memberExpression, parent, state) {
        var propertyName = memberExpression.property.name,
            context = state.context;

        var objectReference = getObjectReferenceFromNode(memberExpression.object, context);

        if (objectReference && objectReference.isObject()) {
            var objectInfo = context.getObjectInfoFor(objectReference);
            if(!objectInfo) {// Every object needs an info, otherwise we did something wrong
                Shade.throwError(memberExpression, "Internal Error: No object registered for: " + objectReference.getTypeString() + JSON.stringify(memberExpression.object));
            }
            if (objectInfo.hasOwnProperty(propertyName)) {
                var propertyHandler = objectInfo[propertyName];
                if (typeof propertyHandler.property == "function") {
                    var result = propertyHandler.property(memberExpression, parent, context, state);
                    return result;
                }
            }
        }

        var exp = new Annotation(memberExpression);
        if(objectReference && objectReference.isGlobal()) {
            var propertyLiteral =  { type: Syntax.Identifier, name: getNameForGlobal(objectReference, propertyName)};
            var propertyAnnotation =  new Annotation(propertyLiteral);
            propertyAnnotation.copy(exp);
            propertyAnnotation.setGlobal(true);

            return propertyLiteral;
        }

    };

    var getNameForGlobal = function(reference, baseName) {
        var entry = reference[baseName];
        if(entry) {
            if (entry.source == Sources.VERTEX) {
                return "frag_" + baseName;
            }
        }
        return baseName;
    }

    var handleBinaryExpression = function (binaryExpression, parent, cb) {
        // In GL, we can't mix up floats, ints and boold for binary expressions
        var left = new Annotation(binaryExpression.left),
            right = new Annotation(binaryExpression.right);

        if (left.isNumber() && right.isInt()) {
            binaryExpression.right = castToFloat(binaryExpression.right);
        }
        else if (right.isNumber() && left.isInt()) {
            binaryExpression.left = castToFloat(binaryExpression.left);
        }

        if (binaryExpression.operator == "%") {
            return handleModulo(binaryExpression);
        }
        return binaryExpression;
    }

    function castToFloat(ast) {
        var exp = new Annotation(ast);

        if (!exp.isNumber()) {   // Cast
            return {
                type: Syntax.CallExpression,
                callee: {
                    type: Syntax.Identifier,
                    name: "float"
                },
                arguments: [ast]
            }
        }
        return ast;
    }

    function castToInt(ast, force) {
        var exp = new Annotation(ast);

        if (!exp.isInt() || force) {   // Cast
            return {
                type: Syntax.CallExpression,
                callee: {
                    type: Syntax.Identifier,
                    name: "int"
                },
                arguments: [ast]
            }
        }
        return ast;
    }

    var handleModulo = function (binaryExpression) {
        binaryExpression.right = castToFloat(binaryExpression.right);
        binaryExpression.left = castToFloat(binaryExpression.left);
        return {
            type: Syntax.CallExpression,
            callee: {
                type: Syntax.Identifier,
                name: "mod"
            },
            arguments: [
                binaryExpression.left,
                binaryExpression.right
            ],
            extra: {
                type: Types.NUMBER
            }
        }
    }

    var handleConditionalExpression = function(node, state, root) {
        var consequent = new Annotation(node.consequent);
        var alternate = new Annotation(node.alternate);
        if (consequent.canEliminate()) {
            return root.replace(node.alternate, state);
        }
        if (alternate.canEliminate()) {
            return root.replace(node.consequent, state);
        }

    }

    var handleIfStatement = function (node) {
        var consequent = new Annotation(node.consequent);
        var alternate = node.alternate ? new Annotation(node.alternate) : null;
        if (consequent.canEliminate()) {
            if (alternate) {
                return node.alternate;
            }
            return {
                type: Syntax.EmptyStatement
            }
        } else if (alternate && alternate.canEliminate()) {
            return node.consequent;
        }
        // We still have a real if statement
       var test = new Annotation(node.test);
       switch(test.getType()) {
           case Types.INT:
           case Types.NUMBER:
               node.test = {
                   type: Syntax.BinaryExpression,
                   operator: "!=",
                   left: node.test,
                   right: {
                       type: Syntax.Literal,
                       value: 0,
                       extra: {
                           type: test.getType()
                       }
                   }
               }
       }


    };

    var handleLogicalExpression = function (node, root, state) {
        var left = new Annotation(node.left);
        var right = new Annotation(node.right);
        if (left.canEliminate())
            return root.replace(node.right, state);
        if (right.canEliminate())
            return root.replace(node.left, state);
    }

    // Exports
    ns.GLASTTransformer = GLASTTransformer;


}(exports));

},{"../../base/annotation.js":19,"../../base/context.js":20,"../../base/index.js":21,"../../base/typeinfo.js":22,"./../../interfaces.js":36,"./registry/index.js":27,"estraverse":4}],36:[function(require,module,exports){
(function (ns) {
    var Base = require("./base/index.js");
    /**
     * @enum {string}
     */
    ns.TYPES = {
        ANY: "any",
        INT: "int",
        NUMBER: "number",
        BOOLEAN: "boolean",
        OBJECT: "object",
        ARRAY: "array",
        NULL: "null",
        UNDEFINED: "undefined",
        FUNCTION: "function",
        STRING: "string"
    }

    ns.OBJECT_KINDS = {
        ANY: "any",
        FLOAT2: "float2", // virtual kinds
        FLOAT3: "float3", // virtual kinds
        FLOAT4: "float4", // virtual kinds
        NORMAL: "normal",
        MATRIX4: "matrix4",
        MATRIX3: "matrix3",
        COLOR_CLOSURE: "color_closure"
    }

    ns.SOURCES = {
        UNIFORM: "uniform",
        VERTEX: "vertex",
        CONSTANT: "constant"
    }

    function fillVector(dest, vecSize, arguments){
        var color = false;
        if(arguments.length == 0 ){
            for(var i = 0; i < vecSize; ++i)
                dest[i] = 0;
            if(color) dest[3] = 1;
            return;
        }
        if(arguments.length == 1 && !isNaN(arguments[0])){
            for(var i = 0; i < vecSize; ++i)
                dest[i] = arguments[0];
            if(color) dest[3] = 1;
            return;
        }

        var idx = 0;
        for(var i = 0; idx < vecSize && i < arguments.length; ++i){
            var arg= arguments[i], cnt = 1;
            if(arg instanceof Vec2) cnt = 2;
            else if(arg instanceof Vec3) cnt = 3;
            else if(arg instanceof Vec4) cnt = 4;

            if(cnt == 1)
                dest[idx++] = arg || 0;
            else
                for(var j = 0; idx < vecSize && j < cnt; ++j){
                    dest[idx++] = arg[j];
                }
        }
        if(i < arguments.length)
            throw new Error("Too many arguments for " + (color ? "Color" : "Vec" + vecSize) + ".");
        if(idx < vecSize){
            if(color && (idx == 3))
                dest[3] = 1;
            else
                throw new Error("Not enough arguments for " + (color ? "Color" : "Vec" + vecSize) + ".");
        }
    }


    // TODO: Generate Swizzle functions
    var SWIZZLE_KEYS = [
        ['x','y','z','w'],
        ['r', 'g', 'b', 'a'],
        ['s', 't', 'p', 'q']
    ]

    function addSwizzles(prototype, vecCount, maskCount, withSetter){
        var max = Math.pow(vecCount, maskCount);
        for(var i = 0; i < max; ++i){
            var indices = [], keys = ["", "", ""], val = i, args = [];
            var setterArgs = [], generateSetter = withSetter;
            for(var j = 0; j < maskCount; ++j){
                var idx = val % vecCount;
                indices.push(idx);
                if(generateSetter){
                    if(setterArgs[idx] === undefined)
                        setterArgs[idx] = 'other[' + j + ']';
                    else
                        generateSetter = false;
                }
                for(var k = 0; k < SWIZZLE_KEYS.length; ++k){
                    keys[k] += SWIZZLE_KEYS[k][idx];
                }
                val = Math.floor(val / vecCount);
                args.push('this['+ idx + ']' );
            }

            var funcArgs = "";
            var body = '  return getVec' + maskCount + '.apply(null, arguments);\n';
            if(generateSetter){
                for(var j = 0; j < vecCount; ++j){
                    if(setterArgs[j] === undefined)
                        setterArgs[j] = 'this[' + j + ']';
                }
                switch(maskCount){
                    case 2 : funcArgs = "x, y"; break;
                    case 3 : funcArgs = "x, y, z"; break;
                    case 4 : funcArgs = "x, y, z, w"; break;
                }

                body = "  if(arguments.length == 0)\n  " + body +
                       "  else{\n" +
                       "    var other=getVec" + maskCount + '.apply(null, arguments);\n' +
                       "    return getVec" + vecCount + '(' + setterArgs.join(", ") + ');\n' +
                       "  }\n";
            }
            var functionCode = 'function(' + funcArgs +  '){\n' + body + '}';
            try{
                var result = eval("(" + functionCode + ")");
                for(var j = 0; j < keys.length; ++j)
                    prototype[keys[j]] = result;
            }
            catch(e){
                console.error("Error Compiling Code:\n" + functionCode);
                throw e;

            }


        }
    }


    /**
     * The virtual Vec2 type
     * @constructor
     */
     var Vec2 = function(x, y){
        fillVector(this, 2, arguments);
     }


     function getVec2(){
        if(arguments[0] instanceof Vec2)
            return arguments[0];
        var obj =  new Vec2();
        Vec2.apply(obj, arguments);
        return obj;
     }

     Vec2.prototype.add = function(x, y){ // 0 arguments => identity or error?
        var add = getVec2.apply(null, arguments);
        return new Vec2(this[0] + add[0], this[1] + add[1]);
     }
     Vec2.prototype.sub = function(x, y){
        var sub = getVec2.apply(null, arguments);
        return new Vec2(this[0] - sub[0], this[1] - sub[1]);
     }
     Vec2.prototype.mul = function(x, y){
        var other = getVec2.apply(null, arguments);
        return new Vec2(this[0] * other[0], this[1] * other[1]);
     }
     Vec2.prototype.div = function(x, y){
        var other = getVec2.apply(null, arguments);
        return new Vec2(this[0] / other[0], this[1] / other[1]);
     }
     Vec2.prototype.mod = function(x, y){
        var other = getVec2.apply(null, arguments);
        return new Vec2(this[0] % other[0], this[1] % other[1]);
     }
     Vec2.prototype.dot = function(x, y){
        var other = getVec2.apply(null, arguments);
        return this[0]*other[0] + this[1]*other[1];
     }
     Vec2.prototype.abs = function(){
        return new Vec2(Math.abs(this[0]), Math.abs(this[1]));
     }
     Vec2.prototype.length = function(length){
        if(arguments.length == 0)
            return Math.sqrt(this.dot(this));
        else{
            return this.mul(length / this.length());
        }
     }
     Vec2.prototype.normalize = function(){
        return this.length(1);
     }

     Vec2.prototype.xy = Vec2.prototype.rg = Vec2.prototype.st = function(x,y){
        if(arguments.length == 0)
            return this;
        else{
            return getVec2.apply(null, arguments);
        }
     }
     Vec2.prototype.x = Vec2.prototype.r = Vec2.prototype.s = function(x){
        if(arguments.length == 0)
            return this[0];
        else
            return this.xy(x, this[1]);
     }
     Vec2.prototype.y = Vec2.prototype.g = Vec2.prototype.t = function(y){
        if(arguments.length == 0)
            return this[1];
        else
            return this.xy(this[0], y);
     }

     addSwizzles(Vec2.prototype, 2, 2, true);
     addSwizzles(Vec2.prototype, 2, 3, false);
     addSwizzles(Vec2.prototype, 2, 4, false);



     /**
      * The virtual Vec3 type
      * @constructor
      */
     var Vec3 = function(x, y, z ){
        fillVector(this, 3, arguments);
     }

     function getVec3(){
        if(arguments[0] instanceof Vec3)
            return arguments[0];
        var obj = new Vec3();
        Vec3.apply(obj, arguments);
        return obj;
     }

     Vec3.prototype.add = function(x, y, z){
        var other = getVec3.apply(null, arguments);
        return new Vec3(this[0] + other[0], this[1] + other[1], this[2] + other[2]);
     }
     Vec3.prototype.sub = function(x, y, z){
        var other = getVec3.apply(null, arguments);
        return new Vec3(this[0] - other[0], this[1] - other[1], this[2] - other[2]);
     }
     Vec3.prototype.mul = function(x, y, z){
        var other = getVec3.apply(null, arguments);
        return new Vec3(this[0] * other[0], this[1] * other[1], this[2] * other[2]);
     }
     Vec3.prototype.div = function(x, y, z){
        var other = getVec3.apply(null, arguments);
        return new Vec3(this[0] / other[0], this[1] / other[1], this[2] / other[2]);
     }
     Vec3.prototype.mod = function(x, y, z){
        var other = getVec3.apply(null, arguments);
        return new Vec3(this[0] % other[0], this[1] % other[1], this[2] % other[2]);
     }
     Vec3.prototype.abs = function(){
        return new Vec3(Math.abs(this[0]), Math.abs(this[1]), Math.abs(this[2]));
     }
     Vec3.prototype.dot = function(x, y, z){
        var other = getVec3.apply(null, arguments);
        return this[0]*other[0] + this[1]*other[1] + this[2]*other[2];
     }
     Vec3.prototype.cross = function(x, y, z){
        var other = getVec3.apply(null, arguments);
        var x = this[1]*other[2] - other[1]*this[2];
        var y = this[2]*other[0] - other[2]*this[0];
        var z = this[0]*other[1] - other[0]*this[1];
        return new Vec3(x, y, z);
     }
     Vec3.prototype.length = function(length){
        if(arguments.length == 0)
            return Math.sqrt(this.dot(this));
        else{
            return this.mul(length / this.length());
        }
     }
     Vec3.prototype.normalize = function(){
        return this.length(1);
     }
     Vec3.prototype.xyz = Vec3.prototype.rgb = Vec3.prototype.stp = function(x, y, z){
        if(arguments.length == 0)
            return this;
        else
            return new Vec3(x, y, z);
     }
     Vec3.prototype.x = Vec3.prototype.r = Vec3.prototype.s = function(x){
        if(arguments.length == 0)
            return this[0];
        else
            return new Vec3(x, this[1], this[2]);
     }
     Vec3.prototype.y = Vec3.prototype.g = Vec3.prototype.t = function(y){
        if(arguments.length == 0)
            return this[1];
        else
            return new Vec3(this[0], y, this[2]);
     }
     Vec3.prototype.z = Vec3.prototype.b = Vec3.prototype.p = function(z){
        if(arguments.length == 0)
            return this[2];
        else
            return new Vec3(this[0], this[1], z);
     }
     addSwizzles(Vec3.prototype, 3, 2, true);
     addSwizzles(Vec3.prototype, 3, 3, true);
     addSwizzles(Vec3.prototype, 3, 4, false);


     /**
      * The virtual Vec4 type
      * @constructor
      */
     var Vec4 = function(x, y, z, w ){
        fillVector(this, 4, arguments)
     }

     function getVec4(){
        if(arguments[0] instanceof Vec4)
            return arguments[0];
        var obj = new Vec4();
        Vec4.apply(obj, arguments);
        return obj;
     }

     Vec4.prototype.add = function(x, y, z, w){
        var other = getVec4.apply(null, arguments);
        return new Vec4(this[0] + other[0], this[1] + other[1], this[2] + other[2], this[3] + other[3]);
     }
     Vec4.prototype.sub = function(x, y, z, w){
        var other = getVec4.apply(null, arguments);
        return new Vec4(this[0] - other[0], this[1] - other[1], this[2] - other[2], this[3] - other[3]);
     }
     Vec4.prototype.mul = function(x, y, z, w){
        var other = getVec4.apply(null, arguments);
        return new Vec4(this[0] * other[0], this[1] * other[1], this[2] * other[2], this[3] * other[3]);
     }
     Vec4.prototype.div = function(x, y, z, w){
        var other = getVec4.apply(null, arguments);
        return new Vec4(this[0] / other[0], this[1] / other[1], this[2] / other[2], this[3] / other[3]);
     }
     Vec4.prototype.mod = function(x, y, z, w){
        var other = getVec4.apply(null, arguments);
        return new Vec4(this[0] % other[0], this[1] % other[1], this[2] % other[2], this[3] % other[3]);
     }
     Vec4.prototype.abs = function(){
        return new Vec4(Math.abs(this[0]), Math.abs(this[1]), Math.abs(this[2]), Math.abs(this[3]));
     }
     Vec4.prototype.dot = function(x, y, z, w){
        var other = getVec4.apply(null, arguments);
        return this[0]*other[0] + this[1]*other[1] + this[2]*other[2] + this[3]*other[3];
     }
     Vec4.prototype.length = function(length){
        if(arguments.length == 0)
            return Math.sqrt(this.dot(this));
        else{
            return this.mul(length / this.length());
        }
     }
     Vec4.prototype.normalize = function(){
        return this.length(1);
     }
     Vec4.prototype.xyzw = Vec4.prototype.rgba = Vec4.prototype.stpq = function(x, y, z, w){
        if(arguments.length == 0)
            return this;
        else
            return getVec4.apply(null, arguments);
     }
     Vec4.prototype.x = Vec4.prototype.r = Vec4.prototype.s = function(x){
        if(arguments.length == 0)
            return this[0];
        else
            return getVec4(x, this[1], this[2], this[3]);
     }

     Vec4.prototype.y = Vec4.prototype.g = Vec4.prototype.t = function(y){
        if(arguments.length == 0)
            return this[1];
        else
            return getVec4(this[0], y, this[2], this[3]);
     }
     Vec4.prototype.z = Vec4.prototype.b = Vec4.prototype.p = function(z){
        if(arguments.length == 0)
            return this[2];
        else
            return getVec4(this[0], this[1], z, this[3]);
     }
     Vec4.prototype.w = Vec4.prototype.a = Vec4.prototype.q = function(w){
        if(arguments.length == 0)
            return this[3];
        else
            return getVec4(this[0], this[1],this[2], w );
     }
     addSwizzles(Vec4.prototype, 4, 2, true);
     addSwizzles(Vec4.prototype, 4, 3, true);
     addSwizzles(Vec4.prototype, 4, 4, true);

     /**
      * The virtual Color type
      * @constructor
      */
     var Color = Vec4;

    var Shade = {};

    Shade.clamp = function(x, minVal, maxVal) {
        return Math.min(Math.max(x, minVal), maxVal);
    };

    Shade.smoothstep = function(edge1, edge2, x) {
        var t = Shade.clamp((x - edge1) / (edge2 - edge1), 0.0, 1.0);
        return t * t * (3.0 - 2.0 * t);
    };

    Shade.step = function(edge, x) {
        return x < edge ? 0 : 1;
    };

    Shade.fract = function(x) {
        return x - Math.floor(x);
    }


    /**
     * @param {object} node
     * @param {string} msg
     */
    ns.throwError = function(node, msg) {
        var loc = node && node.loc;
        if (loc && loc.start.line) {
            msg = "Line " + loc.start.line + ": " + msg;
        }
        var error = new Error(msg);
        error.loc = loc;
        throw error;
    }

    ns.Vec2 = Vec2;
    ns.Vec3 = Vec3;
    ns.Vec4 = Vec4;
    ns.Color = Color;
    ns.Shade = Shade;

}(exports));

},{"./base/index.js":21}],37:[function(require,module,exports){
(function (ns) {
    var parser = require('esprima'),
        parameters = require("./analyze/parameters.js"),
        interfaces = require("./interfaces.js"),
        inference = require("./analyze/typeinference/typeinference.js"),
        Base = require("./base/index.js"),
        GLSLCompiler = require("./generate/glsl/compiler.js").GLSLCompiler;



    Base.extend(ns, {

        /**
         * Analyzes a javascript program and returns a list of parameters
         * @param {function()|string) func
         * @returns {object!}
         */
        extractParameters: function (func, opt) {
            if (typeof func == 'function') {
                func = func.toString();
            }
            var ast = parser.parse(func);

            return parameters.extractParameters(ast, opt);
        },

        parseAndInferenceExpression: function (str, opt) {
            opt = opt || {};
            var ast = parser.parse(str, {raw: true, loc: opt.loc || false });
            var aast = inference.infer(ast, opt);
            return aast;
        },

        compileFragmentShader: function(aast){
            return new GLSLCompiler().compileFragmentShader(aast);
        },

        TYPES : interfaces.TYPES,
        OBJECT_KINDS : interfaces.OBJECT_KINDS,
        SOURCES: interfaces.SOURCES,
        Vec2: interfaces.Vec2,
        Vec3: interfaces.Vec3,
        Vec4: interfaces.Vec4,
        Color: interfaces.Color

});
    /**
     * Library version:
     */
    ns.version = '0.0.1';

}(exports));

},{"./analyze/parameters.js":5,"./analyze/typeinference/typeinference.js":18,"./base/index.js":21,"./generate/glsl/compiler.js":24,"./interfaces.js":36,"esprima":3}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXGJ1aWxkXFxzaGFkZS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcaW5kZXguanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXG5vZGVfbW9kdWxlc1xcZXNwcmltYVxcZXNwcmltYS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcbm9kZV9tb2R1bGVzXFxlc3RyYXZlcnNlXFxlc3RyYXZlcnNlLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGFuYWx5emVcXHBhcmFtZXRlcnMuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxcaW5mZXJfZXhwcmVzc2lvbi5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxpbmZlcl9zdGF0ZW1lbnQuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXGNvbG9yY2xvc3VyZS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxyZWdpc3RyeVxcaW5kZXguanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXG1hdGguanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXG1hdHJpeC5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxyZWdpc3RyeVxcc2hhZGUuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXHN5c3RlbS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxyZWdpc3RyeVxcdG9vbHMuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXHZlYzIuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXHZlYzMuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXHZlYzQuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxcdHlwZWluZmVyZW5jZS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxiYXNlXFxhbm5vdGF0aW9uLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGJhc2VcXGNvbnRleHQuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYmFzZVxcaW5kZXguanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYmFzZVxcdHlwZWluZm8uanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYmFzZVxcdmVjLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxjb21waWxlci5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxcZ2xzbC1nZW5lcmF0ZS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXGNvbG9yY2xvc3VyZS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXGluZGV4LmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxyZWdpc3RyeVxcbWF0aC5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXHNoYWRlLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxyZWdpc3RyeVxcc3lzdGVtLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxyZWdpc3RyeVxcdG9vbHMuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcZ2VuZXJhdGVcXGdsc2xcXHJlZ2lzdHJ5XFx2ZWMyLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxyZWdpc3RyeVxcdmVjMy5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXHZlYzQuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcZ2VuZXJhdGVcXGdsc2xcXHRyYW5zZm9ybS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxpbnRlcmZhY2VzLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXHNoYWRlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwMEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDemdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9MQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDak9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdjQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1YkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGdsb2JhbCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDoge307XG4gICAgZ2xvYmFsLlNoYWRlID0gcmVxdWlyZShcIi4uL2luZGV4LmpzXCIpO1xufSgpKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9zcmMvc2hhZGUuanMnKTsiLCIvKlxuICBDb3B5cmlnaHQgKEMpIDIwMTIgQXJpeWEgSGlkYXlhdCA8YXJpeWEuaGlkYXlhdEBnbWFpbC5jb20+XG4gIENvcHlyaWdodCAoQykgMjAxMiBNYXRoaWFzIEJ5bmVucyA8bWF0aGlhc0BxaXdpLmJlPlxuICBDb3B5cmlnaHQgKEMpIDIwMTIgSm9vc3QtV2ltIEJvZWtlc3RlaWpuIDxqb29zdC13aW1AYm9la2VzdGVpam4ubmw+XG4gIENvcHlyaWdodCAoQykgMjAxMiBLcmlzIEtvd2FsIDxrcmlzLmtvd2FsQGNpeGFyLmNvbT5cbiAgQ29weXJpZ2h0IChDKSAyMDEyIFl1c3VrZSBTdXp1a2kgPHV0YXRhbmUudGVhQGdtYWlsLmNvbT5cbiAgQ29weXJpZ2h0IChDKSAyMDEyIEFycGFkIEJvcnNvcyA8YXJwYWQuYm9yc29zQGdvb2dsZW1haWwuY29tPlxuICBDb3B5cmlnaHQgKEMpIDIwMTEgQXJpeWEgSGlkYXlhdCA8YXJpeWEuaGlkYXlhdEBnbWFpbC5jb20+XG5cbiAgUmVkaXN0cmlidXRpb24gYW5kIHVzZSBpbiBzb3VyY2UgYW5kIGJpbmFyeSBmb3Jtcywgd2l0aCBvciB3aXRob3V0XG4gIG1vZGlmaWNhdGlvbiwgYXJlIHBlcm1pdHRlZCBwcm92aWRlZCB0aGF0IHRoZSBmb2xsb3dpbmcgY29uZGl0aW9ucyBhcmUgbWV0OlxuXG4gICAgKiBSZWRpc3RyaWJ1dGlvbnMgb2Ygc291cmNlIGNvZGUgbXVzdCByZXRhaW4gdGhlIGFib3ZlIGNvcHlyaWdodFxuICAgICAgbm90aWNlLCB0aGlzIGxpc3Qgb2YgY29uZGl0aW9ucyBhbmQgdGhlIGZvbGxvd2luZyBkaXNjbGFpbWVyLlxuICAgICogUmVkaXN0cmlidXRpb25zIGluIGJpbmFyeSBmb3JtIG11c3QgcmVwcm9kdWNlIHRoZSBhYm92ZSBjb3B5cmlnaHRcbiAgICAgIG5vdGljZSwgdGhpcyBsaXN0IG9mIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmcgZGlzY2xhaW1lciBpbiB0aGVcbiAgICAgIGRvY3VtZW50YXRpb24gYW5kL29yIG90aGVyIG1hdGVyaWFscyBwcm92aWRlZCB3aXRoIHRoZSBkaXN0cmlidXRpb24uXG5cbiAgVEhJUyBTT0ZUV0FSRSBJUyBQUk9WSURFRCBCWSBUSEUgQ09QWVJJR0hUIEhPTERFUlMgQU5EIENPTlRSSUJVVE9SUyBcIkFTIElTXCJcbiAgQU5EIEFOWSBFWFBSRVNTIE9SIElNUExJRUQgV0FSUkFOVElFUywgSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFRIRVxuICBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZIEFORCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRVxuICBBUkUgRElTQ0xBSU1FRC4gSU4gTk8gRVZFTlQgU0hBTEwgPENPUFlSSUdIVCBIT0xERVI+IEJFIExJQUJMRSBGT1IgQU5ZXG4gIERJUkVDVCwgSU5ESVJFQ1QsIElOQ0lERU5UQUwsIFNQRUNJQUwsIEVYRU1QTEFSWSwgT1IgQ09OU0VRVUVOVElBTCBEQU1BR0VTXG4gIChJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgUFJPQ1VSRU1FTlQgT0YgU1VCU1RJVFVURSBHT09EUyBPUiBTRVJWSUNFUztcbiAgTE9TUyBPRiBVU0UsIERBVEEsIE9SIFBST0ZJVFM7IE9SIEJVU0lORVNTIElOVEVSUlVQVElPTikgSE9XRVZFUiBDQVVTRUQgQU5EXG4gIE9OIEFOWSBUSEVPUlkgT0YgTElBQklMSVRZLCBXSEVUSEVSIElOIENPTlRSQUNULCBTVFJJQ1QgTElBQklMSVRZLCBPUiBUT1JUXG4gIChJTkNMVURJTkcgTkVHTElHRU5DRSBPUiBPVEhFUldJU0UpIEFSSVNJTkcgSU4gQU5ZIFdBWSBPVVQgT0YgVEhFIFVTRSBPRlxuICBUSElTIFNPRlRXQVJFLCBFVkVOIElGIEFEVklTRUQgT0YgVEhFIFBPU1NJQklMSVRZIE9GIFNVQ0ggREFNQUdFLlxuKi9cblxuLypqc2xpbnQgYml0d2lzZTp0cnVlIHBsdXNwbHVzOnRydWUgKi9cbi8qZ2xvYmFsIGVzcHJpbWE6dHJ1ZSwgZGVmaW5lOnRydWUsIGV4cG9ydHM6dHJ1ZSwgd2luZG93OiB0cnVlLFxudGhyb3dFcnJvcjogdHJ1ZSwgY3JlYXRlTGl0ZXJhbDogdHJ1ZSwgZ2VuZXJhdGVTdGF0ZW1lbnQ6IHRydWUsXG5wYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uOiB0cnVlLCBwYXJzZUJsb2NrOiB0cnVlLCBwYXJzZUV4cHJlc3Npb246IHRydWUsXG5wYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb246IHRydWUsIHBhcnNlRnVuY3Rpb25FeHByZXNzaW9uOiB0cnVlLFxucGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzOiB0cnVlLCBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcjogdHJ1ZSxcbnBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbjogdHJ1ZSxcbnBhcnNlU3RhdGVtZW50OiB0cnVlLCBwYXJzZVNvdXJjZUVsZW1lbnQ6IHRydWUgKi9cblxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gVW5pdmVyc2FsIE1vZHVsZSBEZWZpbml0aW9uIChVTUQpIHRvIHN1cHBvcnQgQU1ELCBDb21tb25KUy9Ob2RlLmpzLFxuICAgIC8vIFJoaW5vLCBhbmQgcGxhaW4gYnJvd3NlciBsb2FkaW5nLlxuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKFsnZXhwb3J0cyddLCBmYWN0b3J5KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBmYWN0b3J5KGV4cG9ydHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZhY3RvcnkoKHJvb3QuZXNwcmltYSA9IHt9KSk7XG4gICAgfVxufSh0aGlzLCBmdW5jdGlvbiAoZXhwb3J0cykge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBUb2tlbixcbiAgICAgICAgVG9rZW5OYW1lLFxuICAgICAgICBTeW50YXgsXG4gICAgICAgIFByb3BlcnR5S2luZCxcbiAgICAgICAgTWVzc2FnZXMsXG4gICAgICAgIFJlZ2V4LFxuICAgICAgICBzb3VyY2UsXG4gICAgICAgIHN0cmljdCxcbiAgICAgICAgaW5kZXgsXG4gICAgICAgIGxpbmVOdW1iZXIsXG4gICAgICAgIGxpbmVTdGFydCxcbiAgICAgICAgbGVuZ3RoLFxuICAgICAgICBidWZmZXIsXG4gICAgICAgIHN0YXRlLFxuICAgICAgICBleHRyYTtcblxuICAgIFRva2VuID0ge1xuICAgICAgICBCb29sZWFuTGl0ZXJhbDogMSxcbiAgICAgICAgRU9GOiAyLFxuICAgICAgICBJZGVudGlmaWVyOiAzLFxuICAgICAgICBLZXl3b3JkOiA0LFxuICAgICAgICBOdWxsTGl0ZXJhbDogNSxcbiAgICAgICAgTnVtZXJpY0xpdGVyYWw6IDYsXG4gICAgICAgIFB1bmN0dWF0b3I6IDcsXG4gICAgICAgIFN0cmluZ0xpdGVyYWw6IDhcbiAgICB9O1xuXG4gICAgVG9rZW5OYW1lID0ge307XG4gICAgVG9rZW5OYW1lW1Rva2VuLkJvb2xlYW5MaXRlcmFsXSA9ICdCb29sZWFuJztcbiAgICBUb2tlbk5hbWVbVG9rZW4uRU9GXSA9ICc8ZW5kPic7XG4gICAgVG9rZW5OYW1lW1Rva2VuLklkZW50aWZpZXJdID0gJ0lkZW50aWZpZXInO1xuICAgIFRva2VuTmFtZVtUb2tlbi5LZXl3b3JkXSA9ICdLZXl3b3JkJztcbiAgICBUb2tlbk5hbWVbVG9rZW4uTnVsbExpdGVyYWxdID0gJ051bGwnO1xuICAgIFRva2VuTmFtZVtUb2tlbi5OdW1lcmljTGl0ZXJhbF0gPSAnTnVtZXJpYyc7XG4gICAgVG9rZW5OYW1lW1Rva2VuLlB1bmN0dWF0b3JdID0gJ1B1bmN0dWF0b3InO1xuICAgIFRva2VuTmFtZVtUb2tlbi5TdHJpbmdMaXRlcmFsXSA9ICdTdHJpbmcnO1xuXG4gICAgU3ludGF4ID0ge1xuICAgICAgICBBc3NpZ25tZW50RXhwcmVzc2lvbjogJ0Fzc2lnbm1lbnRFeHByZXNzaW9uJyxcbiAgICAgICAgQXJyYXlFeHByZXNzaW9uOiAnQXJyYXlFeHByZXNzaW9uJyxcbiAgICAgICAgQmxvY2tTdGF0ZW1lbnQ6ICdCbG9ja1N0YXRlbWVudCcsXG4gICAgICAgIEJpbmFyeUV4cHJlc3Npb246ICdCaW5hcnlFeHByZXNzaW9uJyxcbiAgICAgICAgQnJlYWtTdGF0ZW1lbnQ6ICdCcmVha1N0YXRlbWVudCcsXG4gICAgICAgIENhbGxFeHByZXNzaW9uOiAnQ2FsbEV4cHJlc3Npb24nLFxuICAgICAgICBDYXRjaENsYXVzZTogJ0NhdGNoQ2xhdXNlJyxcbiAgICAgICAgQ29uZGl0aW9uYWxFeHByZXNzaW9uOiAnQ29uZGl0aW9uYWxFeHByZXNzaW9uJyxcbiAgICAgICAgQ29udGludWVTdGF0ZW1lbnQ6ICdDb250aW51ZVN0YXRlbWVudCcsXG4gICAgICAgIERvV2hpbGVTdGF0ZW1lbnQ6ICdEb1doaWxlU3RhdGVtZW50JyxcbiAgICAgICAgRGVidWdnZXJTdGF0ZW1lbnQ6ICdEZWJ1Z2dlclN0YXRlbWVudCcsXG4gICAgICAgIEVtcHR5U3RhdGVtZW50OiAnRW1wdHlTdGF0ZW1lbnQnLFxuICAgICAgICBFeHByZXNzaW9uU3RhdGVtZW50OiAnRXhwcmVzc2lvblN0YXRlbWVudCcsXG4gICAgICAgIEZvclN0YXRlbWVudDogJ0ZvclN0YXRlbWVudCcsXG4gICAgICAgIEZvckluU3RhdGVtZW50OiAnRm9ySW5TdGF0ZW1lbnQnLFxuICAgICAgICBGdW5jdGlvbkRlY2xhcmF0aW9uOiAnRnVuY3Rpb25EZWNsYXJhdGlvbicsXG4gICAgICAgIEZ1bmN0aW9uRXhwcmVzc2lvbjogJ0Z1bmN0aW9uRXhwcmVzc2lvbicsXG4gICAgICAgIElkZW50aWZpZXI6ICdJZGVudGlmaWVyJyxcbiAgICAgICAgSWZTdGF0ZW1lbnQ6ICdJZlN0YXRlbWVudCcsXG4gICAgICAgIExpdGVyYWw6ICdMaXRlcmFsJyxcbiAgICAgICAgTGFiZWxlZFN0YXRlbWVudDogJ0xhYmVsZWRTdGF0ZW1lbnQnLFxuICAgICAgICBMb2dpY2FsRXhwcmVzc2lvbjogJ0xvZ2ljYWxFeHByZXNzaW9uJyxcbiAgICAgICAgTWVtYmVyRXhwcmVzc2lvbjogJ01lbWJlckV4cHJlc3Npb24nLFxuICAgICAgICBOZXdFeHByZXNzaW9uOiAnTmV3RXhwcmVzc2lvbicsXG4gICAgICAgIE9iamVjdEV4cHJlc3Npb246ICdPYmplY3RFeHByZXNzaW9uJyxcbiAgICAgICAgUHJvZ3JhbTogJ1Byb2dyYW0nLFxuICAgICAgICBQcm9wZXJ0eTogJ1Byb3BlcnR5JyxcbiAgICAgICAgUmV0dXJuU3RhdGVtZW50OiAnUmV0dXJuU3RhdGVtZW50JyxcbiAgICAgICAgU2VxdWVuY2VFeHByZXNzaW9uOiAnU2VxdWVuY2VFeHByZXNzaW9uJyxcbiAgICAgICAgU3dpdGNoU3RhdGVtZW50OiAnU3dpdGNoU3RhdGVtZW50JyxcbiAgICAgICAgU3dpdGNoQ2FzZTogJ1N3aXRjaENhc2UnLFxuICAgICAgICBUaGlzRXhwcmVzc2lvbjogJ1RoaXNFeHByZXNzaW9uJyxcbiAgICAgICAgVGhyb3dTdGF0ZW1lbnQ6ICdUaHJvd1N0YXRlbWVudCcsXG4gICAgICAgIFRyeVN0YXRlbWVudDogJ1RyeVN0YXRlbWVudCcsXG4gICAgICAgIFVuYXJ5RXhwcmVzc2lvbjogJ1VuYXJ5RXhwcmVzc2lvbicsXG4gICAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdVcGRhdGVFeHByZXNzaW9uJyxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdGlvbjogJ1ZhcmlhYmxlRGVjbGFyYXRpb24nLFxuICAgICAgICBWYXJpYWJsZURlY2xhcmF0b3I6ICdWYXJpYWJsZURlY2xhcmF0b3InLFxuICAgICAgICBXaGlsZVN0YXRlbWVudDogJ1doaWxlU3RhdGVtZW50JyxcbiAgICAgICAgV2l0aFN0YXRlbWVudDogJ1dpdGhTdGF0ZW1lbnQnXG4gICAgfTtcblxuICAgIFByb3BlcnR5S2luZCA9IHtcbiAgICAgICAgRGF0YTogMSxcbiAgICAgICAgR2V0OiAyLFxuICAgICAgICBTZXQ6IDRcbiAgICB9O1xuXG4gICAgLy8gRXJyb3IgbWVzc2FnZXMgc2hvdWxkIGJlIGlkZW50aWNhbCB0byBWOC5cbiAgICBNZXNzYWdlcyA9IHtcbiAgICAgICAgVW5leHBlY3RlZFRva2VuOiAgJ1VuZXhwZWN0ZWQgdG9rZW4gJTAnLFxuICAgICAgICBVbmV4cGVjdGVkTnVtYmVyOiAgJ1VuZXhwZWN0ZWQgbnVtYmVyJyxcbiAgICAgICAgVW5leHBlY3RlZFN0cmluZzogICdVbmV4cGVjdGVkIHN0cmluZycsXG4gICAgICAgIFVuZXhwZWN0ZWRJZGVudGlmaWVyOiAgJ1VuZXhwZWN0ZWQgaWRlbnRpZmllcicsXG4gICAgICAgIFVuZXhwZWN0ZWRSZXNlcnZlZDogICdVbmV4cGVjdGVkIHJlc2VydmVkIHdvcmQnLFxuICAgICAgICBVbmV4cGVjdGVkRU9TOiAgJ1VuZXhwZWN0ZWQgZW5kIG9mIGlucHV0JyxcbiAgICAgICAgTmV3bGluZUFmdGVyVGhyb3c6ICAnSWxsZWdhbCBuZXdsaW5lIGFmdGVyIHRocm93JyxcbiAgICAgICAgSW52YWxpZFJlZ0V4cDogJ0ludmFsaWQgcmVndWxhciBleHByZXNzaW9uJyxcbiAgICAgICAgVW50ZXJtaW5hdGVkUmVnRXhwOiAgJ0ludmFsaWQgcmVndWxhciBleHByZXNzaW9uOiBtaXNzaW5nIC8nLFxuICAgICAgICBJbnZhbGlkTEhTSW5Bc3NpZ25tZW50OiAgJ0ludmFsaWQgbGVmdC1oYW5kIHNpZGUgaW4gYXNzaWdubWVudCcsXG4gICAgICAgIEludmFsaWRMSFNJbkZvckluOiAgJ0ludmFsaWQgbGVmdC1oYW5kIHNpZGUgaW4gZm9yLWluJyxcbiAgICAgICAgTXVsdGlwbGVEZWZhdWx0c0luU3dpdGNoOiAnTW9yZSB0aGFuIG9uZSBkZWZhdWx0IGNsYXVzZSBpbiBzd2l0Y2ggc3RhdGVtZW50JyxcbiAgICAgICAgTm9DYXRjaE9yRmluYWxseTogICdNaXNzaW5nIGNhdGNoIG9yIGZpbmFsbHkgYWZ0ZXIgdHJ5JyxcbiAgICAgICAgVW5rbm93bkxhYmVsOiAnVW5kZWZpbmVkIGxhYmVsIFxcJyUwXFwnJyxcbiAgICAgICAgUmVkZWNsYXJhdGlvbjogJyUwIFxcJyUxXFwnIGhhcyBhbHJlYWR5IGJlZW4gZGVjbGFyZWQnLFxuICAgICAgICBJbGxlZ2FsQ29udGludWU6ICdJbGxlZ2FsIGNvbnRpbnVlIHN0YXRlbWVudCcsXG4gICAgICAgIElsbGVnYWxCcmVhazogJ0lsbGVnYWwgYnJlYWsgc3RhdGVtZW50JyxcbiAgICAgICAgSWxsZWdhbFJldHVybjogJ0lsbGVnYWwgcmV0dXJuIHN0YXRlbWVudCcsXG4gICAgICAgIFN0cmljdE1vZGVXaXRoOiAgJ1N0cmljdCBtb2RlIGNvZGUgbWF5IG5vdCBpbmNsdWRlIGEgd2l0aCBzdGF0ZW1lbnQnLFxuICAgICAgICBTdHJpY3RDYXRjaFZhcmlhYmxlOiAgJ0NhdGNoIHZhcmlhYmxlIG1heSBub3QgYmUgZXZhbCBvciBhcmd1bWVudHMgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RWYXJOYW1lOiAgJ1ZhcmlhYmxlIG5hbWUgbWF5IG5vdCBiZSBldmFsIG9yIGFyZ3VtZW50cyBpbiBzdHJpY3QgbW9kZScsXG4gICAgICAgIFN0cmljdFBhcmFtTmFtZTogICdQYXJhbWV0ZXIgbmFtZSBldmFsIG9yIGFyZ3VtZW50cyBpcyBub3QgYWxsb3dlZCBpbiBzdHJpY3QgbW9kZScsXG4gICAgICAgIFN0cmljdFBhcmFtRHVwZTogJ1N0cmljdCBtb2RlIGZ1bmN0aW9uIG1heSBub3QgaGF2ZSBkdXBsaWNhdGUgcGFyYW1ldGVyIG5hbWVzJyxcbiAgICAgICAgU3RyaWN0RnVuY3Rpb25OYW1lOiAgJ0Z1bmN0aW9uIG5hbWUgbWF5IG5vdCBiZSBldmFsIG9yIGFyZ3VtZW50cyBpbiBzdHJpY3QgbW9kZScsXG4gICAgICAgIFN0cmljdE9jdGFsTGl0ZXJhbDogICdPY3RhbCBsaXRlcmFscyBhcmUgbm90IGFsbG93ZWQgaW4gc3RyaWN0IG1vZGUuJyxcbiAgICAgICAgU3RyaWN0RGVsZXRlOiAgJ0RlbGV0ZSBvZiBhbiB1bnF1YWxpZmllZCBpZGVudGlmaWVyIGluIHN0cmljdCBtb2RlLicsXG4gICAgICAgIFN0cmljdER1cGxpY2F0ZVByb3BlcnR5OiAgJ0R1cGxpY2F0ZSBkYXRhIHByb3BlcnR5IGluIG9iamVjdCBsaXRlcmFsIG5vdCBhbGxvd2VkIGluIHN0cmljdCBtb2RlJyxcbiAgICAgICAgQWNjZXNzb3JEYXRhUHJvcGVydHk6ICAnT2JqZWN0IGxpdGVyYWwgbWF5IG5vdCBoYXZlIGRhdGEgYW5kIGFjY2Vzc29yIHByb3BlcnR5IHdpdGggdGhlIHNhbWUgbmFtZScsXG4gICAgICAgIEFjY2Vzc29yR2V0U2V0OiAgJ09iamVjdCBsaXRlcmFsIG1heSBub3QgaGF2ZSBtdWx0aXBsZSBnZXQvc2V0IGFjY2Vzc29ycyB3aXRoIHRoZSBzYW1lIG5hbWUnLFxuICAgICAgICBTdHJpY3RMSFNBc3NpZ25tZW50OiAgJ0Fzc2lnbm1lbnQgdG8gZXZhbCBvciBhcmd1bWVudHMgaXMgbm90IGFsbG93ZWQgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RMSFNQb3N0Zml4OiAgJ1Bvc3RmaXggaW5jcmVtZW50L2RlY3JlbWVudCBtYXkgbm90IGhhdmUgZXZhbCBvciBhcmd1bWVudHMgb3BlcmFuZCBpbiBzdHJpY3QgbW9kZScsXG4gICAgICAgIFN0cmljdExIU1ByZWZpeDogICdQcmVmaXggaW5jcmVtZW50L2RlY3JlbWVudCBtYXkgbm90IGhhdmUgZXZhbCBvciBhcmd1bWVudHMgb3BlcmFuZCBpbiBzdHJpY3QgbW9kZScsXG4gICAgICAgIFN0cmljdFJlc2VydmVkV29yZDogICdVc2Ugb2YgZnV0dXJlIHJlc2VydmVkIHdvcmQgaW4gc3RyaWN0IG1vZGUnXG4gICAgfTtcblxuICAgIC8vIFNlZSBhbHNvIHRvb2xzL2dlbmVyYXRlLXVuaWNvZGUtcmVnZXgucHkuXG4gICAgUmVnZXggPSB7XG4gICAgICAgIE5vbkFzY2lpSWRlbnRpZmllclN0YXJ0OiBuZXcgUmVnRXhwKCdbXFx4YWFcXHhiNVxceGJhXFx4YzAtXFx4ZDZcXHhkOC1cXHhmNlxceGY4LVxcdTAyYzFcXHUwMmM2LVxcdTAyZDFcXHUwMmUwLVxcdTAyZTRcXHUwMmVjXFx1MDJlZVxcdTAzNzAtXFx1MDM3NFxcdTAzNzZcXHUwMzc3XFx1MDM3YS1cXHUwMzdkXFx1MDM4NlxcdTAzODgtXFx1MDM4YVxcdTAzOGNcXHUwMzhlLVxcdTAzYTFcXHUwM2EzLVxcdTAzZjVcXHUwM2Y3LVxcdTA0ODFcXHUwNDhhLVxcdTA1MjdcXHUwNTMxLVxcdTA1NTZcXHUwNTU5XFx1MDU2MS1cXHUwNTg3XFx1MDVkMC1cXHUwNWVhXFx1MDVmMC1cXHUwNWYyXFx1MDYyMC1cXHUwNjRhXFx1MDY2ZVxcdTA2NmZcXHUwNjcxLVxcdTA2ZDNcXHUwNmQ1XFx1MDZlNVxcdTA2ZTZcXHUwNmVlXFx1MDZlZlxcdTA2ZmEtXFx1MDZmY1xcdTA2ZmZcXHUwNzEwXFx1MDcxMi1cXHUwNzJmXFx1MDc0ZC1cXHUwN2E1XFx1MDdiMVxcdTA3Y2EtXFx1MDdlYVxcdTA3ZjRcXHUwN2Y1XFx1MDdmYVxcdTA4MDAtXFx1MDgxNVxcdTA4MWFcXHUwODI0XFx1MDgyOFxcdTA4NDAtXFx1MDg1OFxcdTA4YTBcXHUwOGEyLVxcdTA4YWNcXHUwOTA0LVxcdTA5MzlcXHUwOTNkXFx1MDk1MFxcdTA5NTgtXFx1MDk2MVxcdTA5NzEtXFx1MDk3N1xcdTA5NzktXFx1MDk3ZlxcdTA5ODUtXFx1MDk4Y1xcdTA5OGZcXHUwOTkwXFx1MDk5My1cXHUwOWE4XFx1MDlhYS1cXHUwOWIwXFx1MDliMlxcdTA5YjYtXFx1MDliOVxcdTA5YmRcXHUwOWNlXFx1MDlkY1xcdTA5ZGRcXHUwOWRmLVxcdTA5ZTFcXHUwOWYwXFx1MDlmMVxcdTBhMDUtXFx1MGEwYVxcdTBhMGZcXHUwYTEwXFx1MGExMy1cXHUwYTI4XFx1MGEyYS1cXHUwYTMwXFx1MGEzMlxcdTBhMzNcXHUwYTM1XFx1MGEzNlxcdTBhMzhcXHUwYTM5XFx1MGE1OS1cXHUwYTVjXFx1MGE1ZVxcdTBhNzItXFx1MGE3NFxcdTBhODUtXFx1MGE4ZFxcdTBhOGYtXFx1MGE5MVxcdTBhOTMtXFx1MGFhOFxcdTBhYWEtXFx1MGFiMFxcdTBhYjJcXHUwYWIzXFx1MGFiNS1cXHUwYWI5XFx1MGFiZFxcdTBhZDBcXHUwYWUwXFx1MGFlMVxcdTBiMDUtXFx1MGIwY1xcdTBiMGZcXHUwYjEwXFx1MGIxMy1cXHUwYjI4XFx1MGIyYS1cXHUwYjMwXFx1MGIzMlxcdTBiMzNcXHUwYjM1LVxcdTBiMzlcXHUwYjNkXFx1MGI1Y1xcdTBiNWRcXHUwYjVmLVxcdTBiNjFcXHUwYjcxXFx1MGI4M1xcdTBiODUtXFx1MGI4YVxcdTBiOGUtXFx1MGI5MFxcdTBiOTItXFx1MGI5NVxcdTBiOTlcXHUwYjlhXFx1MGI5Y1xcdTBiOWVcXHUwYjlmXFx1MGJhM1xcdTBiYTRcXHUwYmE4LVxcdTBiYWFcXHUwYmFlLVxcdTBiYjlcXHUwYmQwXFx1MGMwNS1cXHUwYzBjXFx1MGMwZS1cXHUwYzEwXFx1MGMxMi1cXHUwYzI4XFx1MGMyYS1cXHUwYzMzXFx1MGMzNS1cXHUwYzM5XFx1MGMzZFxcdTBjNThcXHUwYzU5XFx1MGM2MFxcdTBjNjFcXHUwYzg1LVxcdTBjOGNcXHUwYzhlLVxcdTBjOTBcXHUwYzkyLVxcdTBjYThcXHUwY2FhLVxcdTBjYjNcXHUwY2I1LVxcdTBjYjlcXHUwY2JkXFx1MGNkZVxcdTBjZTBcXHUwY2UxXFx1MGNmMVxcdTBjZjJcXHUwZDA1LVxcdTBkMGNcXHUwZDBlLVxcdTBkMTBcXHUwZDEyLVxcdTBkM2FcXHUwZDNkXFx1MGQ0ZVxcdTBkNjBcXHUwZDYxXFx1MGQ3YS1cXHUwZDdmXFx1MGQ4NS1cXHUwZDk2XFx1MGQ5YS1cXHUwZGIxXFx1MGRiMy1cXHUwZGJiXFx1MGRiZFxcdTBkYzAtXFx1MGRjNlxcdTBlMDEtXFx1MGUzMFxcdTBlMzJcXHUwZTMzXFx1MGU0MC1cXHUwZTQ2XFx1MGU4MVxcdTBlODJcXHUwZTg0XFx1MGU4N1xcdTBlODhcXHUwZThhXFx1MGU4ZFxcdTBlOTQtXFx1MGU5N1xcdTBlOTktXFx1MGU5ZlxcdTBlYTEtXFx1MGVhM1xcdTBlYTVcXHUwZWE3XFx1MGVhYVxcdTBlYWJcXHUwZWFkLVxcdTBlYjBcXHUwZWIyXFx1MGViM1xcdTBlYmRcXHUwZWMwLVxcdTBlYzRcXHUwZWM2XFx1MGVkYy1cXHUwZWRmXFx1MGYwMFxcdTBmNDAtXFx1MGY0N1xcdTBmNDktXFx1MGY2Y1xcdTBmODgtXFx1MGY4Y1xcdTEwMDAtXFx1MTAyYVxcdTEwM2ZcXHUxMDUwLVxcdTEwNTVcXHUxMDVhLVxcdTEwNWRcXHUxMDYxXFx1MTA2NVxcdTEwNjZcXHUxMDZlLVxcdTEwNzBcXHUxMDc1LVxcdTEwODFcXHUxMDhlXFx1MTBhMC1cXHUxMGM1XFx1MTBjN1xcdTEwY2RcXHUxMGQwLVxcdTEwZmFcXHUxMGZjLVxcdTEyNDhcXHUxMjRhLVxcdTEyNGRcXHUxMjUwLVxcdTEyNTZcXHUxMjU4XFx1MTI1YS1cXHUxMjVkXFx1MTI2MC1cXHUxMjg4XFx1MTI4YS1cXHUxMjhkXFx1MTI5MC1cXHUxMmIwXFx1MTJiMi1cXHUxMmI1XFx1MTJiOC1cXHUxMmJlXFx1MTJjMFxcdTEyYzItXFx1MTJjNVxcdTEyYzgtXFx1MTJkNlxcdTEyZDgtXFx1MTMxMFxcdTEzMTItXFx1MTMxNVxcdTEzMTgtXFx1MTM1YVxcdTEzODAtXFx1MTM4ZlxcdTEzYTAtXFx1MTNmNFxcdTE0MDEtXFx1MTY2Y1xcdTE2NmYtXFx1MTY3ZlxcdTE2ODEtXFx1MTY5YVxcdTE2YTAtXFx1MTZlYVxcdTE2ZWUtXFx1MTZmMFxcdTE3MDAtXFx1MTcwY1xcdTE3MGUtXFx1MTcxMVxcdTE3MjAtXFx1MTczMVxcdTE3NDAtXFx1MTc1MVxcdTE3NjAtXFx1MTc2Y1xcdTE3NmUtXFx1MTc3MFxcdTE3ODAtXFx1MTdiM1xcdTE3ZDdcXHUxN2RjXFx1MTgyMC1cXHUxODc3XFx1MTg4MC1cXHUxOGE4XFx1MThhYVxcdTE4YjAtXFx1MThmNVxcdTE5MDAtXFx1MTkxY1xcdTE5NTAtXFx1MTk2ZFxcdTE5NzAtXFx1MTk3NFxcdTE5ODAtXFx1MTlhYlxcdTE5YzEtXFx1MTljN1xcdTFhMDAtXFx1MWExNlxcdTFhMjAtXFx1MWE1NFxcdTFhYTdcXHUxYjA1LVxcdTFiMzNcXHUxYjQ1LVxcdTFiNGJcXHUxYjgzLVxcdTFiYTBcXHUxYmFlXFx1MWJhZlxcdTFiYmEtXFx1MWJlNVxcdTFjMDAtXFx1MWMyM1xcdTFjNGQtXFx1MWM0ZlxcdTFjNWEtXFx1MWM3ZFxcdTFjZTktXFx1MWNlY1xcdTFjZWUtXFx1MWNmMVxcdTFjZjVcXHUxY2Y2XFx1MWQwMC1cXHUxZGJmXFx1MWUwMC1cXHUxZjE1XFx1MWYxOC1cXHUxZjFkXFx1MWYyMC1cXHUxZjQ1XFx1MWY0OC1cXHUxZjRkXFx1MWY1MC1cXHUxZjU3XFx1MWY1OVxcdTFmNWJcXHUxZjVkXFx1MWY1Zi1cXHUxZjdkXFx1MWY4MC1cXHUxZmI0XFx1MWZiNi1cXHUxZmJjXFx1MWZiZVxcdTFmYzItXFx1MWZjNFxcdTFmYzYtXFx1MWZjY1xcdTFmZDAtXFx1MWZkM1xcdTFmZDYtXFx1MWZkYlxcdTFmZTAtXFx1MWZlY1xcdTFmZjItXFx1MWZmNFxcdTFmZjYtXFx1MWZmY1xcdTIwNzFcXHUyMDdmXFx1MjA5MC1cXHUyMDljXFx1MjEwMlxcdTIxMDdcXHUyMTBhLVxcdTIxMTNcXHUyMTE1XFx1MjExOS1cXHUyMTFkXFx1MjEyNFxcdTIxMjZcXHUyMTI4XFx1MjEyYS1cXHUyMTJkXFx1MjEyZi1cXHUyMTM5XFx1MjEzYy1cXHUyMTNmXFx1MjE0NS1cXHUyMTQ5XFx1MjE0ZVxcdTIxNjAtXFx1MjE4OFxcdTJjMDAtXFx1MmMyZVxcdTJjMzAtXFx1MmM1ZVxcdTJjNjAtXFx1MmNlNFxcdTJjZWItXFx1MmNlZVxcdTJjZjJcXHUyY2YzXFx1MmQwMC1cXHUyZDI1XFx1MmQyN1xcdTJkMmRcXHUyZDMwLVxcdTJkNjdcXHUyZDZmXFx1MmQ4MC1cXHUyZDk2XFx1MmRhMC1cXHUyZGE2XFx1MmRhOC1cXHUyZGFlXFx1MmRiMC1cXHUyZGI2XFx1MmRiOC1cXHUyZGJlXFx1MmRjMC1cXHUyZGM2XFx1MmRjOC1cXHUyZGNlXFx1MmRkMC1cXHUyZGQ2XFx1MmRkOC1cXHUyZGRlXFx1MmUyZlxcdTMwMDUtXFx1MzAwN1xcdTMwMjEtXFx1MzAyOVxcdTMwMzEtXFx1MzAzNVxcdTMwMzgtXFx1MzAzY1xcdTMwNDEtXFx1MzA5NlxcdTMwOWQtXFx1MzA5ZlxcdTMwYTEtXFx1MzBmYVxcdTMwZmMtXFx1MzBmZlxcdTMxMDUtXFx1MzEyZFxcdTMxMzEtXFx1MzE4ZVxcdTMxYTAtXFx1MzFiYVxcdTMxZjAtXFx1MzFmZlxcdTM0MDAtXFx1NGRiNVxcdTRlMDAtXFx1OWZjY1xcdWEwMDAtXFx1YTQ4Y1xcdWE0ZDAtXFx1YTRmZFxcdWE1MDAtXFx1YTYwY1xcdWE2MTAtXFx1YTYxZlxcdWE2MmFcXHVhNjJiXFx1YTY0MC1cXHVhNjZlXFx1YTY3Zi1cXHVhNjk3XFx1YTZhMC1cXHVhNmVmXFx1YTcxNy1cXHVhNzFmXFx1YTcyMi1cXHVhNzg4XFx1YTc4Yi1cXHVhNzhlXFx1YTc5MC1cXHVhNzkzXFx1YTdhMC1cXHVhN2FhXFx1YTdmOC1cXHVhODAxXFx1YTgwMy1cXHVhODA1XFx1YTgwNy1cXHVhODBhXFx1YTgwYy1cXHVhODIyXFx1YTg0MC1cXHVhODczXFx1YTg4Mi1cXHVhOGIzXFx1YThmMi1cXHVhOGY3XFx1YThmYlxcdWE5MGEtXFx1YTkyNVxcdWE5MzAtXFx1YTk0NlxcdWE5NjAtXFx1YTk3Y1xcdWE5ODQtXFx1YTliMlxcdWE5Y2ZcXHVhYTAwLVxcdWFhMjhcXHVhYTQwLVxcdWFhNDJcXHVhYTQ0LVxcdWFhNGJcXHVhYTYwLVxcdWFhNzZcXHVhYTdhXFx1YWE4MC1cXHVhYWFmXFx1YWFiMVxcdWFhYjVcXHVhYWI2XFx1YWFiOS1cXHVhYWJkXFx1YWFjMFxcdWFhYzJcXHVhYWRiLVxcdWFhZGRcXHVhYWUwLVxcdWFhZWFcXHVhYWYyLVxcdWFhZjRcXHVhYjAxLVxcdWFiMDZcXHVhYjA5LVxcdWFiMGVcXHVhYjExLVxcdWFiMTZcXHVhYjIwLVxcdWFiMjZcXHVhYjI4LVxcdWFiMmVcXHVhYmMwLVxcdWFiZTJcXHVhYzAwLVxcdWQ3YTNcXHVkN2IwLVxcdWQ3YzZcXHVkN2NiLVxcdWQ3ZmJcXHVmOTAwLVxcdWZhNmRcXHVmYTcwLVxcdWZhZDlcXHVmYjAwLVxcdWZiMDZcXHVmYjEzLVxcdWZiMTdcXHVmYjFkXFx1ZmIxZi1cXHVmYjI4XFx1ZmIyYS1cXHVmYjM2XFx1ZmIzOC1cXHVmYjNjXFx1ZmIzZVxcdWZiNDBcXHVmYjQxXFx1ZmI0M1xcdWZiNDRcXHVmYjQ2LVxcdWZiYjFcXHVmYmQzLVxcdWZkM2RcXHVmZDUwLVxcdWZkOGZcXHVmZDkyLVxcdWZkYzdcXHVmZGYwLVxcdWZkZmJcXHVmZTcwLVxcdWZlNzRcXHVmZTc2LVxcdWZlZmNcXHVmZjIxLVxcdWZmM2FcXHVmZjQxLVxcdWZmNWFcXHVmZjY2LVxcdWZmYmVcXHVmZmMyLVxcdWZmYzdcXHVmZmNhLVxcdWZmY2ZcXHVmZmQyLVxcdWZmZDdcXHVmZmRhLVxcdWZmZGNdJyksXG4gICAgICAgIE5vbkFzY2lpSWRlbnRpZmllclBhcnQ6IG5ldyBSZWdFeHAoJ1tcXHhhYVxceGI1XFx4YmFcXHhjMC1cXHhkNlxceGQ4LVxceGY2XFx4ZjgtXFx1MDJjMVxcdTAyYzYtXFx1MDJkMVxcdTAyZTAtXFx1MDJlNFxcdTAyZWNcXHUwMmVlXFx1MDMwMC1cXHUwMzc0XFx1MDM3NlxcdTAzNzdcXHUwMzdhLVxcdTAzN2RcXHUwMzg2XFx1MDM4OC1cXHUwMzhhXFx1MDM4Y1xcdTAzOGUtXFx1MDNhMVxcdTAzYTMtXFx1MDNmNVxcdTAzZjctXFx1MDQ4MVxcdTA0ODMtXFx1MDQ4N1xcdTA0OGEtXFx1MDUyN1xcdTA1MzEtXFx1MDU1NlxcdTA1NTlcXHUwNTYxLVxcdTA1ODdcXHUwNTkxLVxcdTA1YmRcXHUwNWJmXFx1MDVjMVxcdTA1YzJcXHUwNWM0XFx1MDVjNVxcdTA1YzdcXHUwNWQwLVxcdTA1ZWFcXHUwNWYwLVxcdTA1ZjJcXHUwNjEwLVxcdTA2MWFcXHUwNjIwLVxcdTA2NjlcXHUwNjZlLVxcdTA2ZDNcXHUwNmQ1LVxcdTA2ZGNcXHUwNmRmLVxcdTA2ZThcXHUwNmVhLVxcdTA2ZmNcXHUwNmZmXFx1MDcxMC1cXHUwNzRhXFx1MDc0ZC1cXHUwN2IxXFx1MDdjMC1cXHUwN2Y1XFx1MDdmYVxcdTA4MDAtXFx1MDgyZFxcdTA4NDAtXFx1MDg1YlxcdTA4YTBcXHUwOGEyLVxcdTA4YWNcXHUwOGU0LVxcdTA4ZmVcXHUwOTAwLVxcdTA5NjNcXHUwOTY2LVxcdTA5NmZcXHUwOTcxLVxcdTA5NzdcXHUwOTc5LVxcdTA5N2ZcXHUwOTgxLVxcdTA5ODNcXHUwOTg1LVxcdTA5OGNcXHUwOThmXFx1MDk5MFxcdTA5OTMtXFx1MDlhOFxcdTA5YWEtXFx1MDliMFxcdTA5YjJcXHUwOWI2LVxcdTA5YjlcXHUwOWJjLVxcdTA5YzRcXHUwOWM3XFx1MDljOFxcdTA5Y2ItXFx1MDljZVxcdTA5ZDdcXHUwOWRjXFx1MDlkZFxcdTA5ZGYtXFx1MDllM1xcdTA5ZTYtXFx1MDlmMVxcdTBhMDEtXFx1MGEwM1xcdTBhMDUtXFx1MGEwYVxcdTBhMGZcXHUwYTEwXFx1MGExMy1cXHUwYTI4XFx1MGEyYS1cXHUwYTMwXFx1MGEzMlxcdTBhMzNcXHUwYTM1XFx1MGEzNlxcdTBhMzhcXHUwYTM5XFx1MGEzY1xcdTBhM2UtXFx1MGE0MlxcdTBhNDdcXHUwYTQ4XFx1MGE0Yi1cXHUwYTRkXFx1MGE1MVxcdTBhNTktXFx1MGE1Y1xcdTBhNWVcXHUwYTY2LVxcdTBhNzVcXHUwYTgxLVxcdTBhODNcXHUwYTg1LVxcdTBhOGRcXHUwYThmLVxcdTBhOTFcXHUwYTkzLVxcdTBhYThcXHUwYWFhLVxcdTBhYjBcXHUwYWIyXFx1MGFiM1xcdTBhYjUtXFx1MGFiOVxcdTBhYmMtXFx1MGFjNVxcdTBhYzctXFx1MGFjOVxcdTBhY2ItXFx1MGFjZFxcdTBhZDBcXHUwYWUwLVxcdTBhZTNcXHUwYWU2LVxcdTBhZWZcXHUwYjAxLVxcdTBiMDNcXHUwYjA1LVxcdTBiMGNcXHUwYjBmXFx1MGIxMFxcdTBiMTMtXFx1MGIyOFxcdTBiMmEtXFx1MGIzMFxcdTBiMzJcXHUwYjMzXFx1MGIzNS1cXHUwYjM5XFx1MGIzYy1cXHUwYjQ0XFx1MGI0N1xcdTBiNDhcXHUwYjRiLVxcdTBiNGRcXHUwYjU2XFx1MGI1N1xcdTBiNWNcXHUwYjVkXFx1MGI1Zi1cXHUwYjYzXFx1MGI2Ni1cXHUwYjZmXFx1MGI3MVxcdTBiODJcXHUwYjgzXFx1MGI4NS1cXHUwYjhhXFx1MGI4ZS1cXHUwYjkwXFx1MGI5Mi1cXHUwYjk1XFx1MGI5OVxcdTBiOWFcXHUwYjljXFx1MGI5ZVxcdTBiOWZcXHUwYmEzXFx1MGJhNFxcdTBiYTgtXFx1MGJhYVxcdTBiYWUtXFx1MGJiOVxcdTBiYmUtXFx1MGJjMlxcdTBiYzYtXFx1MGJjOFxcdTBiY2EtXFx1MGJjZFxcdTBiZDBcXHUwYmQ3XFx1MGJlNi1cXHUwYmVmXFx1MGMwMS1cXHUwYzAzXFx1MGMwNS1cXHUwYzBjXFx1MGMwZS1cXHUwYzEwXFx1MGMxMi1cXHUwYzI4XFx1MGMyYS1cXHUwYzMzXFx1MGMzNS1cXHUwYzM5XFx1MGMzZC1cXHUwYzQ0XFx1MGM0Ni1cXHUwYzQ4XFx1MGM0YS1cXHUwYzRkXFx1MGM1NVxcdTBjNTZcXHUwYzU4XFx1MGM1OVxcdTBjNjAtXFx1MGM2M1xcdTBjNjYtXFx1MGM2ZlxcdTBjODJcXHUwYzgzXFx1MGM4NS1cXHUwYzhjXFx1MGM4ZS1cXHUwYzkwXFx1MGM5Mi1cXHUwY2E4XFx1MGNhYS1cXHUwY2IzXFx1MGNiNS1cXHUwY2I5XFx1MGNiYy1cXHUwY2M0XFx1MGNjNi1cXHUwY2M4XFx1MGNjYS1cXHUwY2NkXFx1MGNkNVxcdTBjZDZcXHUwY2RlXFx1MGNlMC1cXHUwY2UzXFx1MGNlNi1cXHUwY2VmXFx1MGNmMVxcdTBjZjJcXHUwZDAyXFx1MGQwM1xcdTBkMDUtXFx1MGQwY1xcdTBkMGUtXFx1MGQxMFxcdTBkMTItXFx1MGQzYVxcdTBkM2QtXFx1MGQ0NFxcdTBkNDYtXFx1MGQ0OFxcdTBkNGEtXFx1MGQ0ZVxcdTBkNTdcXHUwZDYwLVxcdTBkNjNcXHUwZDY2LVxcdTBkNmZcXHUwZDdhLVxcdTBkN2ZcXHUwZDgyXFx1MGQ4M1xcdTBkODUtXFx1MGQ5NlxcdTBkOWEtXFx1MGRiMVxcdTBkYjMtXFx1MGRiYlxcdTBkYmRcXHUwZGMwLVxcdTBkYzZcXHUwZGNhXFx1MGRjZi1cXHUwZGQ0XFx1MGRkNlxcdTBkZDgtXFx1MGRkZlxcdTBkZjJcXHUwZGYzXFx1MGUwMS1cXHUwZTNhXFx1MGU0MC1cXHUwZTRlXFx1MGU1MC1cXHUwZTU5XFx1MGU4MVxcdTBlODJcXHUwZTg0XFx1MGU4N1xcdTBlODhcXHUwZThhXFx1MGU4ZFxcdTBlOTQtXFx1MGU5N1xcdTBlOTktXFx1MGU5ZlxcdTBlYTEtXFx1MGVhM1xcdTBlYTVcXHUwZWE3XFx1MGVhYVxcdTBlYWJcXHUwZWFkLVxcdTBlYjlcXHUwZWJiLVxcdTBlYmRcXHUwZWMwLVxcdTBlYzRcXHUwZWM2XFx1MGVjOC1cXHUwZWNkXFx1MGVkMC1cXHUwZWQ5XFx1MGVkYy1cXHUwZWRmXFx1MGYwMFxcdTBmMThcXHUwZjE5XFx1MGYyMC1cXHUwZjI5XFx1MGYzNVxcdTBmMzdcXHUwZjM5XFx1MGYzZS1cXHUwZjQ3XFx1MGY0OS1cXHUwZjZjXFx1MGY3MS1cXHUwZjg0XFx1MGY4Ni1cXHUwZjk3XFx1MGY5OS1cXHUwZmJjXFx1MGZjNlxcdTEwMDAtXFx1MTA0OVxcdTEwNTAtXFx1MTA5ZFxcdTEwYTAtXFx1MTBjNVxcdTEwYzdcXHUxMGNkXFx1MTBkMC1cXHUxMGZhXFx1MTBmYy1cXHUxMjQ4XFx1MTI0YS1cXHUxMjRkXFx1MTI1MC1cXHUxMjU2XFx1MTI1OFxcdTEyNWEtXFx1MTI1ZFxcdTEyNjAtXFx1MTI4OFxcdTEyOGEtXFx1MTI4ZFxcdTEyOTAtXFx1MTJiMFxcdTEyYjItXFx1MTJiNVxcdTEyYjgtXFx1MTJiZVxcdTEyYzBcXHUxMmMyLVxcdTEyYzVcXHUxMmM4LVxcdTEyZDZcXHUxMmQ4LVxcdTEzMTBcXHUxMzEyLVxcdTEzMTVcXHUxMzE4LVxcdTEzNWFcXHUxMzVkLVxcdTEzNWZcXHUxMzgwLVxcdTEzOGZcXHUxM2EwLVxcdTEzZjRcXHUxNDAxLVxcdTE2NmNcXHUxNjZmLVxcdTE2N2ZcXHUxNjgxLVxcdTE2OWFcXHUxNmEwLVxcdTE2ZWFcXHUxNmVlLVxcdTE2ZjBcXHUxNzAwLVxcdTE3MGNcXHUxNzBlLVxcdTE3MTRcXHUxNzIwLVxcdTE3MzRcXHUxNzQwLVxcdTE3NTNcXHUxNzYwLVxcdTE3NmNcXHUxNzZlLVxcdTE3NzBcXHUxNzcyXFx1MTc3M1xcdTE3ODAtXFx1MTdkM1xcdTE3ZDdcXHUxN2RjXFx1MTdkZFxcdTE3ZTAtXFx1MTdlOVxcdTE4MGItXFx1MTgwZFxcdTE4MTAtXFx1MTgxOVxcdTE4MjAtXFx1MTg3N1xcdTE4ODAtXFx1MThhYVxcdTE4YjAtXFx1MThmNVxcdTE5MDAtXFx1MTkxY1xcdTE5MjAtXFx1MTkyYlxcdTE5MzAtXFx1MTkzYlxcdTE5NDYtXFx1MTk2ZFxcdTE5NzAtXFx1MTk3NFxcdTE5ODAtXFx1MTlhYlxcdTE5YjAtXFx1MTljOVxcdTE5ZDAtXFx1MTlkOVxcdTFhMDAtXFx1MWExYlxcdTFhMjAtXFx1MWE1ZVxcdTFhNjAtXFx1MWE3Y1xcdTFhN2YtXFx1MWE4OVxcdTFhOTAtXFx1MWE5OVxcdTFhYTdcXHUxYjAwLVxcdTFiNGJcXHUxYjUwLVxcdTFiNTlcXHUxYjZiLVxcdTFiNzNcXHUxYjgwLVxcdTFiZjNcXHUxYzAwLVxcdTFjMzdcXHUxYzQwLVxcdTFjNDlcXHUxYzRkLVxcdTFjN2RcXHUxY2QwLVxcdTFjZDJcXHUxY2Q0LVxcdTFjZjZcXHUxZDAwLVxcdTFkZTZcXHUxZGZjLVxcdTFmMTVcXHUxZjE4LVxcdTFmMWRcXHUxZjIwLVxcdTFmNDVcXHUxZjQ4LVxcdTFmNGRcXHUxZjUwLVxcdTFmNTdcXHUxZjU5XFx1MWY1YlxcdTFmNWRcXHUxZjVmLVxcdTFmN2RcXHUxZjgwLVxcdTFmYjRcXHUxZmI2LVxcdTFmYmNcXHUxZmJlXFx1MWZjMi1cXHUxZmM0XFx1MWZjNi1cXHUxZmNjXFx1MWZkMC1cXHUxZmQzXFx1MWZkNi1cXHUxZmRiXFx1MWZlMC1cXHUxZmVjXFx1MWZmMi1cXHUxZmY0XFx1MWZmNi1cXHUxZmZjXFx1MjAwY1xcdTIwMGRcXHUyMDNmXFx1MjA0MFxcdTIwNTRcXHUyMDcxXFx1MjA3ZlxcdTIwOTAtXFx1MjA5Y1xcdTIwZDAtXFx1MjBkY1xcdTIwZTFcXHUyMGU1LVxcdTIwZjBcXHUyMTAyXFx1MjEwN1xcdTIxMGEtXFx1MjExM1xcdTIxMTVcXHUyMTE5LVxcdTIxMWRcXHUyMTI0XFx1MjEyNlxcdTIxMjhcXHUyMTJhLVxcdTIxMmRcXHUyMTJmLVxcdTIxMzlcXHUyMTNjLVxcdTIxM2ZcXHUyMTQ1LVxcdTIxNDlcXHUyMTRlXFx1MjE2MC1cXHUyMTg4XFx1MmMwMC1cXHUyYzJlXFx1MmMzMC1cXHUyYzVlXFx1MmM2MC1cXHUyY2U0XFx1MmNlYi1cXHUyY2YzXFx1MmQwMC1cXHUyZDI1XFx1MmQyN1xcdTJkMmRcXHUyZDMwLVxcdTJkNjdcXHUyZDZmXFx1MmQ3Zi1cXHUyZDk2XFx1MmRhMC1cXHUyZGE2XFx1MmRhOC1cXHUyZGFlXFx1MmRiMC1cXHUyZGI2XFx1MmRiOC1cXHUyZGJlXFx1MmRjMC1cXHUyZGM2XFx1MmRjOC1cXHUyZGNlXFx1MmRkMC1cXHUyZGQ2XFx1MmRkOC1cXHUyZGRlXFx1MmRlMC1cXHUyZGZmXFx1MmUyZlxcdTMwMDUtXFx1MzAwN1xcdTMwMjEtXFx1MzAyZlxcdTMwMzEtXFx1MzAzNVxcdTMwMzgtXFx1MzAzY1xcdTMwNDEtXFx1MzA5NlxcdTMwOTlcXHUzMDlhXFx1MzA5ZC1cXHUzMDlmXFx1MzBhMS1cXHUzMGZhXFx1MzBmYy1cXHUzMGZmXFx1MzEwNS1cXHUzMTJkXFx1MzEzMS1cXHUzMThlXFx1MzFhMC1cXHUzMWJhXFx1MzFmMC1cXHUzMWZmXFx1MzQwMC1cXHU0ZGI1XFx1NGUwMC1cXHU5ZmNjXFx1YTAwMC1cXHVhNDhjXFx1YTRkMC1cXHVhNGZkXFx1YTUwMC1cXHVhNjBjXFx1YTYxMC1cXHVhNjJiXFx1YTY0MC1cXHVhNjZmXFx1YTY3NC1cXHVhNjdkXFx1YTY3Zi1cXHVhNjk3XFx1YTY5Zi1cXHVhNmYxXFx1YTcxNy1cXHVhNzFmXFx1YTcyMi1cXHVhNzg4XFx1YTc4Yi1cXHVhNzhlXFx1YTc5MC1cXHVhNzkzXFx1YTdhMC1cXHVhN2FhXFx1YTdmOC1cXHVhODI3XFx1YTg0MC1cXHVhODczXFx1YTg4MC1cXHVhOGM0XFx1YThkMC1cXHVhOGQ5XFx1YThlMC1cXHVhOGY3XFx1YThmYlxcdWE5MDAtXFx1YTkyZFxcdWE5MzAtXFx1YTk1M1xcdWE5NjAtXFx1YTk3Y1xcdWE5ODAtXFx1YTljMFxcdWE5Y2YtXFx1YTlkOVxcdWFhMDAtXFx1YWEzNlxcdWFhNDAtXFx1YWE0ZFxcdWFhNTAtXFx1YWE1OVxcdWFhNjAtXFx1YWE3NlxcdWFhN2FcXHVhYTdiXFx1YWE4MC1cXHVhYWMyXFx1YWFkYi1cXHVhYWRkXFx1YWFlMC1cXHVhYWVmXFx1YWFmMi1cXHVhYWY2XFx1YWIwMS1cXHVhYjA2XFx1YWIwOS1cXHVhYjBlXFx1YWIxMS1cXHVhYjE2XFx1YWIyMC1cXHVhYjI2XFx1YWIyOC1cXHVhYjJlXFx1YWJjMC1cXHVhYmVhXFx1YWJlY1xcdWFiZWRcXHVhYmYwLVxcdWFiZjlcXHVhYzAwLVxcdWQ3YTNcXHVkN2IwLVxcdWQ3YzZcXHVkN2NiLVxcdWQ3ZmJcXHVmOTAwLVxcdWZhNmRcXHVmYTcwLVxcdWZhZDlcXHVmYjAwLVxcdWZiMDZcXHVmYjEzLVxcdWZiMTdcXHVmYjFkLVxcdWZiMjhcXHVmYjJhLVxcdWZiMzZcXHVmYjM4LVxcdWZiM2NcXHVmYjNlXFx1ZmI0MFxcdWZiNDFcXHVmYjQzXFx1ZmI0NFxcdWZiNDYtXFx1ZmJiMVxcdWZiZDMtXFx1ZmQzZFxcdWZkNTAtXFx1ZmQ4ZlxcdWZkOTItXFx1ZmRjN1xcdWZkZjAtXFx1ZmRmYlxcdWZlMDAtXFx1ZmUwZlxcdWZlMjAtXFx1ZmUyNlxcdWZlMzNcXHVmZTM0XFx1ZmU0ZC1cXHVmZTRmXFx1ZmU3MC1cXHVmZTc0XFx1ZmU3Ni1cXHVmZWZjXFx1ZmYxMC1cXHVmZjE5XFx1ZmYyMS1cXHVmZjNhXFx1ZmYzZlxcdWZmNDEtXFx1ZmY1YVxcdWZmNjYtXFx1ZmZiZVxcdWZmYzItXFx1ZmZjN1xcdWZmY2EtXFx1ZmZjZlxcdWZmZDItXFx1ZmZkN1xcdWZmZGEtXFx1ZmZkY10nKVxuICAgIH07XG5cbiAgICAvLyBFbnN1cmUgdGhlIGNvbmRpdGlvbiBpcyB0cnVlLCBvdGhlcndpc2UgdGhyb3cgYW4gZXJyb3IuXG4gICAgLy8gVGhpcyBpcyBvbmx5IHRvIGhhdmUgYSBiZXR0ZXIgY29udHJhY3Qgc2VtYW50aWMsIGkuZS4gYW5vdGhlciBzYWZldHkgbmV0XG4gICAgLy8gdG8gY2F0Y2ggYSBsb2dpYyBlcnJvci4gVGhlIGNvbmRpdGlvbiBzaGFsbCBiZSBmdWxmaWxsZWQgaW4gbm9ybWFsIGNhc2UuXG4gICAgLy8gRG8gTk9UIHVzZSB0aGlzIHRvIGVuZm9yY2UgYSBjZXJ0YWluIGNvbmRpdGlvbiBvbiBhbnkgdXNlciBpbnB1dC5cblxuICAgIGZ1bmN0aW9uIGFzc2VydChjb25kaXRpb24sIG1lc3NhZ2UpIHtcbiAgICAgICAgaWYgKCFjb25kaXRpb24pIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQVNTRVJUOiAnICsgbWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzbGljZVNvdXJjZShmcm9tLCB0bykge1xuICAgICAgICByZXR1cm4gc291cmNlLnNsaWNlKGZyb20sIHRvKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mICdlc3ByaW1hJ1swXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgc2xpY2VTb3VyY2UgPSBmdW5jdGlvbiBzbGljZUFycmF5U291cmNlKGZyb20sIHRvKSB7XG4gICAgICAgICAgICByZXR1cm4gc291cmNlLnNsaWNlKGZyb20sIHRvKS5qb2luKCcnKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0RlY2ltYWxEaWdpdChjaCkge1xuICAgICAgICByZXR1cm4gJzAxMjM0NTY3ODknLmluZGV4T2YoY2gpID49IDA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNIZXhEaWdpdChjaCkge1xuICAgICAgICByZXR1cm4gJzAxMjM0NTY3ODlhYmNkZWZBQkNERUYnLmluZGV4T2YoY2gpID49IDA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNPY3RhbERpZ2l0KGNoKSB7XG4gICAgICAgIHJldHVybiAnMDEyMzQ1NjcnLmluZGV4T2YoY2gpID49IDA7XG4gICAgfVxuXG5cbiAgICAvLyA3LjIgV2hpdGUgU3BhY2VcblxuICAgIGZ1bmN0aW9uIGlzV2hpdGVTcGFjZShjaCkge1xuICAgICAgICByZXR1cm4gKGNoID09PSAnICcpIHx8IChjaCA9PT0gJ1xcdTAwMDknKSB8fCAoY2ggPT09ICdcXHUwMDBCJykgfHxcbiAgICAgICAgICAgIChjaCA9PT0gJ1xcdTAwMEMnKSB8fCAoY2ggPT09ICdcXHUwMEEwJykgfHxcbiAgICAgICAgICAgIChjaC5jaGFyQ29kZUF0KDApID49IDB4MTY4MCAmJlxuICAgICAgICAgICAgICdcXHUxNjgwXFx1MTgwRVxcdTIwMDBcXHUyMDAxXFx1MjAwMlxcdTIwMDNcXHUyMDA0XFx1MjAwNVxcdTIwMDZcXHUyMDA3XFx1MjAwOFxcdTIwMDlcXHUyMDBBXFx1MjAyRlxcdTIwNUZcXHUzMDAwXFx1RkVGRicuaW5kZXhPZihjaCkgPj0gMCk7XG4gICAgfVxuXG4gICAgLy8gNy4zIExpbmUgVGVybWluYXRvcnNcblxuICAgIGZ1bmN0aW9uIGlzTGluZVRlcm1pbmF0b3IoY2gpIHtcbiAgICAgICAgcmV0dXJuIChjaCA9PT0gJ1xcbicgfHwgY2ggPT09ICdcXHInIHx8IGNoID09PSAnXFx1MjAyOCcgfHwgY2ggPT09ICdcXHUyMDI5Jyk7XG4gICAgfVxuXG4gICAgLy8gNy42IElkZW50aWZpZXIgTmFtZXMgYW5kIElkZW50aWZpZXJzXG5cbiAgICBmdW5jdGlvbiBpc0lkZW50aWZpZXJTdGFydChjaCkge1xuICAgICAgICByZXR1cm4gKGNoID09PSAnJCcpIHx8IChjaCA9PT0gJ18nKSB8fCAoY2ggPT09ICdcXFxcJykgfHxcbiAgICAgICAgICAgIChjaCA+PSAnYScgJiYgY2ggPD0gJ3onKSB8fCAoY2ggPj0gJ0EnICYmIGNoIDw9ICdaJykgfHxcbiAgICAgICAgICAgICgoY2guY2hhckNvZGVBdCgwKSA+PSAweDgwKSAmJiBSZWdleC5Ob25Bc2NpaUlkZW50aWZpZXJTdGFydC50ZXN0KGNoKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNJZGVudGlmaWVyUGFydChjaCkge1xuICAgICAgICByZXR1cm4gKGNoID09PSAnJCcpIHx8IChjaCA9PT0gJ18nKSB8fCAoY2ggPT09ICdcXFxcJykgfHxcbiAgICAgICAgICAgIChjaCA+PSAnYScgJiYgY2ggPD0gJ3onKSB8fCAoY2ggPj0gJ0EnICYmIGNoIDw9ICdaJykgfHxcbiAgICAgICAgICAgICgoY2ggPj0gJzAnKSAmJiAoY2ggPD0gJzknKSkgfHxcbiAgICAgICAgICAgICgoY2guY2hhckNvZGVBdCgwKSA+PSAweDgwKSAmJiBSZWdleC5Ob25Bc2NpaUlkZW50aWZpZXJQYXJ0LnRlc3QoY2gpKTtcbiAgICB9XG5cbiAgICAvLyA3LjYuMS4yIEZ1dHVyZSBSZXNlcnZlZCBXb3Jkc1xuXG4gICAgZnVuY3Rpb24gaXNGdXR1cmVSZXNlcnZlZFdvcmQoaWQpIHtcbiAgICAgICAgc3dpdGNoIChpZCkge1xuXG4gICAgICAgIC8vIEZ1dHVyZSByZXNlcnZlZCB3b3Jkcy5cbiAgICAgICAgY2FzZSAnY2xhc3MnOlxuICAgICAgICBjYXNlICdlbnVtJzpcbiAgICAgICAgY2FzZSAnZXhwb3J0JzpcbiAgICAgICAgY2FzZSAnZXh0ZW5kcyc6XG4gICAgICAgIGNhc2UgJ2ltcG9ydCc6XG4gICAgICAgIGNhc2UgJ3N1cGVyJzpcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzU3RyaWN0TW9kZVJlc2VydmVkV29yZChpZCkge1xuICAgICAgICBzd2l0Y2ggKGlkKSB7XG5cbiAgICAgICAgLy8gU3RyaWN0IE1vZGUgcmVzZXJ2ZWQgd29yZHMuXG4gICAgICAgIGNhc2UgJ2ltcGxlbWVudHMnOlxuICAgICAgICBjYXNlICdpbnRlcmZhY2UnOlxuICAgICAgICBjYXNlICdwYWNrYWdlJzpcbiAgICAgICAgY2FzZSAncHJpdmF0ZSc6XG4gICAgICAgIGNhc2UgJ3Byb3RlY3RlZCc6XG4gICAgICAgIGNhc2UgJ3B1YmxpYyc6XG4gICAgICAgIGNhc2UgJ3N0YXRpYyc6XG4gICAgICAgIGNhc2UgJ3lpZWxkJzpcbiAgICAgICAgY2FzZSAnbGV0JzpcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzUmVzdHJpY3RlZFdvcmQoaWQpIHtcbiAgICAgICAgcmV0dXJuIGlkID09PSAnZXZhbCcgfHwgaWQgPT09ICdhcmd1bWVudHMnO1xuICAgIH1cblxuICAgIC8vIDcuNi4xLjEgS2V5d29yZHNcblxuICAgIGZ1bmN0aW9uIGlzS2V5d29yZChpZCkge1xuICAgICAgICB2YXIga2V5d29yZCA9IGZhbHNlO1xuICAgICAgICBzd2l0Y2ggKGlkLmxlbmd0aCkge1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAnaWYnKSB8fCAoaWQgPT09ICdpbicpIHx8IChpZCA9PT0gJ2RvJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAga2V5d29yZCA9IChpZCA9PT0gJ3ZhcicpIHx8IChpZCA9PT0gJ2ZvcicpIHx8IChpZCA9PT0gJ25ldycpIHx8IChpZCA9PT0gJ3RyeScpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgNDpcbiAgICAgICAgICAgIGtleXdvcmQgPSAoaWQgPT09ICd0aGlzJykgfHwgKGlkID09PSAnZWxzZScpIHx8IChpZCA9PT0gJ2Nhc2UnKSB8fCAoaWQgPT09ICd2b2lkJykgfHwgKGlkID09PSAnd2l0aCcpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgNTpcbiAgICAgICAgICAgIGtleXdvcmQgPSAoaWQgPT09ICd3aGlsZScpIHx8IChpZCA9PT0gJ2JyZWFrJykgfHwgKGlkID09PSAnY2F0Y2gnKSB8fCAoaWQgPT09ICd0aHJvdycpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgNjpcbiAgICAgICAgICAgIGtleXdvcmQgPSAoaWQgPT09ICdyZXR1cm4nKSB8fCAoaWQgPT09ICd0eXBlb2YnKSB8fCAoaWQgPT09ICdkZWxldGUnKSB8fCAoaWQgPT09ICdzd2l0Y2gnKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDc6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAnZGVmYXVsdCcpIHx8IChpZCA9PT0gJ2ZpbmFsbHknKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDg6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAnZnVuY3Rpb24nKSB8fCAoaWQgPT09ICdjb250aW51ZScpIHx8IChpZCA9PT0gJ2RlYnVnZ2VyJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAxMDpcbiAgICAgICAgICAgIGtleXdvcmQgPSAoaWQgPT09ICdpbnN0YW5jZW9mJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChrZXl3b3JkKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN3aXRjaCAoaWQpIHtcbiAgICAgICAgLy8gRnV0dXJlIHJlc2VydmVkIHdvcmRzLlxuICAgICAgICAvLyAnY29uc3QnIGlzIHNwZWNpYWxpemVkIGFzIEtleXdvcmQgaW4gVjguXG4gICAgICAgIGNhc2UgJ2NvbnN0JzpcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgICAgIC8vIEZvciBjb21wYXRpYmxpdHkgdG8gU3BpZGVyTW9ua2V5IGFuZCBFUy5uZXh0XG4gICAgICAgIGNhc2UgJ3lpZWxkJzpcbiAgICAgICAgY2FzZSAnbGV0JzpcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN0cmljdCAmJiBpc1N0cmljdE1vZGVSZXNlcnZlZFdvcmQoaWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpc0Z1dHVyZVJlc2VydmVkV29yZChpZCk7XG4gICAgfVxuXG4gICAgLy8gNy40IENvbW1lbnRzXG5cbiAgICBmdW5jdGlvbiBza2lwQ29tbWVudCgpIHtcbiAgICAgICAgdmFyIGNoLCBibG9ja0NvbW1lbnQsIGxpbmVDb21tZW50O1xuXG4gICAgICAgIGJsb2NrQ29tbWVudCA9IGZhbHNlO1xuICAgICAgICBsaW5lQ29tbWVudCA9IGZhbHNlO1xuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuXG4gICAgICAgICAgICBpZiAobGluZUNvbW1lbnQpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICBpZiAoaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGluZUNvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAnXFxyJyAmJiBzb3VyY2VbaW5kZXhdID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICArK2xpbmVOdW1iZXI7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVTdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYmxvY2tDb21tZW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ1xccicgJiYgc291cmNlW2luZGV4ICsgMV0gPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICsrbGluZU51bWJlcjtcbiAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0ID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAnKicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9ja0NvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICcvJykge1xuICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4ICsgMV07XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggKz0gMjtcbiAgICAgICAgICAgICAgICAgICAgbGluZUNvbW1lbnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICcqJykge1xuICAgICAgICAgICAgICAgICAgICBpbmRleCArPSAyO1xuICAgICAgICAgICAgICAgICAgICBibG9ja0NvbW1lbnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzV2hpdGVTcGFjZShjaCkpIHtcbiAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAgJ1xccicgJiYgc291cmNlW2luZGV4XSA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKytsaW5lTnVtYmVyO1xuICAgICAgICAgICAgICAgIGxpbmVTdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNjYW5IZXhFc2NhcGUocHJlZml4KSB7XG4gICAgICAgIHZhciBpLCBsZW4sIGNoLCBjb2RlID0gMDtcblxuICAgICAgICBsZW4gPSAocHJlZml4ID09PSAndScpID8gNCA6IDI7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgICAgaWYgKGluZGV4IDwgbGVuZ3RoICYmIGlzSGV4RGlnaXQoc291cmNlW2luZGV4XSkpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICBjb2RlID0gY29kZSAqIDE2ICsgJzAxMjM0NTY3ODlhYmNkZWYnLmluZGV4T2YoY2gudG9Mb3dlckNhc2UoKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzY2FuSWRlbnRpZmllcigpIHtcbiAgICAgICAgdmFyIGNoLCBzdGFydCwgaWQsIHJlc3RvcmU7XG5cbiAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICBpZiAoIWlzSWRlbnRpZmllclN0YXJ0KGNoKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgICAgaWYgKGNoID09PSAnXFxcXCcpIHtcbiAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICBpZiAoc291cmNlW2luZGV4XSAhPT0gJ3UnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgIHJlc3RvcmUgPSBpbmRleDtcbiAgICAgICAgICAgIGNoID0gc2NhbkhleEVzY2FwZSgndScpO1xuICAgICAgICAgICAgaWYgKGNoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAnXFxcXCcgfHwgIWlzSWRlbnRpZmllclN0YXJ0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlkID0gY2g7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gcmVzdG9yZTtcbiAgICAgICAgICAgICAgICBpZCA9ICd1JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlkID0gc291cmNlW2luZGV4KytdO1xuICAgICAgICB9XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICBpZiAoIWlzSWRlbnRpZmllclBhcnQoY2gpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY2ggPT09ICdcXFxcJykge1xuICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgaWYgKHNvdXJjZVtpbmRleF0gIT09ICd1Jykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgcmVzdG9yZSA9IGluZGV4O1xuICAgICAgICAgICAgICAgIGNoID0gc2NhbkhleEVzY2FwZSgndScpO1xuICAgICAgICAgICAgICAgIGlmIChjaCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICdcXFxcJyB8fCAhaXNJZGVudGlmaWVyUGFydChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZCArPSBjaDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpbmRleCA9IHJlc3RvcmU7XG4gICAgICAgICAgICAgICAgICAgIGlkICs9ICd1JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlkICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRoZXJlIGlzIG5vIGtleXdvcmQgb3IgbGl0ZXJhbCB3aXRoIG9ubHkgb25lIGNoYXJhY3Rlci5cbiAgICAgICAgLy8gVGh1cywgaXQgbXVzdCBiZSBhbiBpZGVudGlmaWVyLlxuICAgICAgICBpZiAoaWQubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLklkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGlkLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzS2V5d29yZChpZCkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uS2V5d29yZCxcbiAgICAgICAgICAgICAgICB2YWx1ZTogaWQsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyA3LjguMSBOdWxsIExpdGVyYWxzXG5cbiAgICAgICAgaWYgKGlkID09PSAnbnVsbCcpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uTnVsbExpdGVyYWwsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGlkLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gNy44LjIgQm9vbGVhbiBMaXRlcmFsc1xuXG4gICAgICAgIGlmIChpZCA9PT0gJ3RydWUnIHx8IGlkID09PSAnZmFsc2UnKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLkJvb2xlYW5MaXRlcmFsLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBpZCxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBUb2tlbi5JZGVudGlmaWVyLFxuICAgICAgICAgICAgdmFsdWU6IGlkLFxuICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gNy43IFB1bmN0dWF0b3JzXG5cbiAgICBmdW5jdGlvbiBzY2FuUHVuY3R1YXRvcigpIHtcbiAgICAgICAgdmFyIHN0YXJ0ID0gaW5kZXgsXG4gICAgICAgICAgICBjaDEgPSBzb3VyY2VbaW5kZXhdLFxuICAgICAgICAgICAgY2gyLFxuICAgICAgICAgICAgY2gzLFxuICAgICAgICAgICAgY2g0O1xuXG4gICAgICAgIC8vIENoZWNrIGZvciBtb3N0IGNvbW1vbiBzaW5nbGUtY2hhcmFjdGVyIHB1bmN0dWF0b3JzLlxuXG4gICAgICAgIGlmIChjaDEgPT09ICc7JyB8fCBjaDEgPT09ICd7JyB8fCBjaDEgPT09ICd9Jykge1xuICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogY2gxLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoMSA9PT0gJywnIHx8IGNoMSA9PT0gJygnIHx8IGNoMSA9PT0gJyknKSB7XG4gICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBjaDEsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEb3QgKC4pIGNhbiBhbHNvIHN0YXJ0IGEgZmxvYXRpbmctcG9pbnQgbnVtYmVyLCBoZW5jZSB0aGUgbmVlZFxuICAgICAgICAvLyB0byBjaGVjayB0aGUgbmV4dCBjaGFyYWN0ZXIuXG5cbiAgICAgICAgY2gyID0gc291cmNlW2luZGV4ICsgMV07XG4gICAgICAgIGlmIChjaDEgPT09ICcuJyAmJiAhaXNEZWNpbWFsRGlnaXQoY2gyKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBzb3VyY2VbaW5kZXgrK10sXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQZWVrIG1vcmUgY2hhcmFjdGVycy5cblxuICAgICAgICBjaDMgPSBzb3VyY2VbaW5kZXggKyAyXTtcbiAgICAgICAgY2g0ID0gc291cmNlW2luZGV4ICsgM107XG5cbiAgICAgICAgLy8gNC1jaGFyYWN0ZXIgcHVuY3R1YXRvcjogPj4+PVxuXG4gICAgICAgIGlmIChjaDEgPT09ICc+JyAmJiBjaDIgPT09ICc+JyAmJiBjaDMgPT09ICc+Jykge1xuICAgICAgICAgICAgaWYgKGNoNCA9PT0gJz0nKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggKz0gNDtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJz4+Pj0nLFxuICAgICAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIDMtY2hhcmFjdGVyIHB1bmN0dWF0b3JzOiA9PT0gIT09ID4+PiA8PD0gPj49XG5cbiAgICAgICAgaWYgKGNoMSA9PT0gJz0nICYmIGNoMiA9PT0gJz0nICYmIGNoMyA9PT0gJz0nKSB7XG4gICAgICAgICAgICBpbmRleCArPSAzO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAnPT09JyxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaDEgPT09ICchJyAmJiBjaDIgPT09ICc9JyAmJiBjaDMgPT09ICc9Jykge1xuICAgICAgICAgICAgaW5kZXggKz0gMztcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogJyE9PScsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2gxID09PSAnPicgJiYgY2gyID09PSAnPicgJiYgY2gzID09PSAnPicpIHtcbiAgICAgICAgICAgIGluZGV4ICs9IDM7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgdmFsdWU6ICc+Pj4nLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoMSA9PT0gJzwnICYmIGNoMiA9PT0gJzwnICYmIGNoMyA9PT0gJz0nKSB7XG4gICAgICAgICAgICBpbmRleCArPSAzO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAnPDw9JyxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaDEgPT09ICc+JyAmJiBjaDIgPT09ICc+JyAmJiBjaDMgPT09ICc9Jykge1xuICAgICAgICAgICAgaW5kZXggKz0gMztcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogJz4+PScsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyAyLWNoYXJhY3RlciBwdW5jdHVhdG9yczogPD0gPj0gPT0gIT0gKysgLS0gPDwgPj4gJiYgfHxcbiAgICAgICAgLy8gKz0gLT0gKj0gJT0gJj0gfD0gXj0gLz1cblxuICAgICAgICBpZiAoY2gyID09PSAnPScpIHtcbiAgICAgICAgICAgIGlmICgnPD49ISstKiUmfF4vJy5pbmRleE9mKGNoMSkgPj0gMCkge1xuICAgICAgICAgICAgICAgIGluZGV4ICs9IDI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGNoMSArIGNoMixcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2gxID09PSBjaDIgJiYgKCcrLTw+JnwnLmluZGV4T2YoY2gxKSA+PSAwKSkge1xuICAgICAgICAgICAgaWYgKCcrLTw+JnwnLmluZGV4T2YoY2gyKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggKz0gMjtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogY2gxICsgY2gyLFxuICAgICAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRoZSByZW1haW5pbmcgMS1jaGFyYWN0ZXIgcHVuY3R1YXRvcnMuXG5cbiAgICAgICAgaWYgKCdbXTw+Ky0qJSZ8XiF+Pzo9LycuaW5kZXhPZihjaDEpID49IDApIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogc291cmNlW2luZGV4KytdLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gNy44LjMgTnVtZXJpYyBMaXRlcmFsc1xuXG4gICAgZnVuY3Rpb24gc2Nhbk51bWVyaWNMaXRlcmFsKCkge1xuICAgICAgICB2YXIgbnVtYmVyLCBzdGFydCwgY2g7XG5cbiAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICBhc3NlcnQoaXNEZWNpbWFsRGlnaXQoY2gpIHx8IChjaCA9PT0gJy4nKSxcbiAgICAgICAgICAgICdOdW1lcmljIGxpdGVyYWwgbXVzdCBzdGFydCB3aXRoIGEgZGVjaW1hbCBkaWdpdCBvciBhIGRlY2ltYWwgcG9pbnQnKTtcblxuICAgICAgICBzdGFydCA9IGluZGV4O1xuICAgICAgICBudW1iZXIgPSAnJztcbiAgICAgICAgaWYgKGNoICE9PSAnLicpIHtcbiAgICAgICAgICAgIG51bWJlciA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcblxuICAgICAgICAgICAgLy8gSGV4IG51bWJlciBzdGFydHMgd2l0aCAnMHgnLlxuICAgICAgICAgICAgLy8gT2N0YWwgbnVtYmVyIHN0YXJ0cyB3aXRoICcwJy5cbiAgICAgICAgICAgIGlmIChudW1iZXIgPT09ICcwJykge1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ3gnIHx8IGNoID09PSAnWCcpIHtcbiAgICAgICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzSGV4RGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKG51bWJlci5sZW5ndGggPD0gMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gb25seSAweFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNJZGVudGlmaWVyU3RhcnQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5OdW1lcmljTGl0ZXJhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBwYXJzZUludChudW1iZXIsIDE2KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNPY3RhbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXNPY3RhbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzSWRlbnRpZmllclN0YXJ0KGNoKSB8fCBpc0RlY2ltYWxEaWdpdChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLk51bWVyaWNMaXRlcmFsLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHBhcnNlSW50KG51bWJlciwgOCksXG4gICAgICAgICAgICAgICAgICAgICAgICBvY3RhbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGRlY2ltYWwgbnVtYmVyIHN0YXJ0cyB3aXRoICcwJyBzdWNoIGFzICcwOScgaXMgaWxsZWdhbC5cbiAgICAgICAgICAgICAgICBpZiAoaXNEZWNpbWFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzRGVjaW1hbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaCA9PT0gJy4nKSB7XG4gICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgIGlmICghaXNEZWNpbWFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoID09PSAnZScgfHwgY2ggPT09ICdFJykge1xuICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcblxuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgaWYgKGNoID09PSAnKycgfHwgY2ggPT09ICctJykge1xuICAgICAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgIGlmIChpc0RlY2ltYWxEaWdpdChjaCkpIHtcbiAgICAgICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgICAgIGlmICghaXNEZWNpbWFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2ggPSAnY2hhcmFjdGVyICcgKyBjaDtcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNoID0gJzxlbmQ+JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICBpZiAoaXNJZGVudGlmaWVyU3RhcnQoY2gpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFRva2VuLk51bWVyaWNMaXRlcmFsLFxuICAgICAgICAgICAgdmFsdWU6IHBhcnNlRmxvYXQobnVtYmVyKSxcbiAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDcuOC40IFN0cmluZyBMaXRlcmFsc1xuXG4gICAgZnVuY3Rpb24gc2NhblN0cmluZ0xpdGVyYWwoKSB7XG4gICAgICAgIHZhciBzdHIgPSAnJywgcXVvdGUsIHN0YXJ0LCBjaCwgY29kZSwgdW5lc2NhcGVkLCByZXN0b3JlLCBvY3RhbCA9IGZhbHNlO1xuXG4gICAgICAgIHF1b3RlID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgYXNzZXJ0KChxdW90ZSA9PT0gJ1xcJycgfHwgcXVvdGUgPT09ICdcIicpLFxuICAgICAgICAgICAgJ1N0cmluZyBsaXRlcmFsIG11c3Qgc3RhcnRzIHdpdGggYSBxdW90ZScpO1xuXG4gICAgICAgIHN0YXJ0ID0gaW5kZXg7XG4gICAgICAgICsraW5kZXg7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcblxuICAgICAgICAgICAgaWYgKGNoID09PSBxdW90ZSkge1xuICAgICAgICAgICAgICAgIHF1b3RlID0gJyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnXFxcXCcpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoY2gpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbic6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcbic7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncic6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xccic7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcdCc7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndSc6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3gnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdG9yZSA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgdW5lc2NhcGVkID0gc2NhbkhleEVzY2FwZShjaCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodW5lc2NhcGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9IHVuZXNjYXBlZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXggPSByZXN0b3JlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSBjaDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdiJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSAnXFxiJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdmJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSAnXFxmJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd2JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSAnXFx4MEInO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc09jdGFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZSA9ICcwMTIzNDU2NycuaW5kZXhPZihjaCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBcXDAgaXMgbm90IG9jdGFsIGVzY2FwZSBzZXF1ZW5jZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb2RlICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9jdGFsID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPCBsZW5ndGggJiYgaXNPY3RhbERpZ2l0KHNvdXJjZVtpbmRleF0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9jdGFsID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZSA9IGNvZGUgKiA4ICsgJzAxMjM0NTY3Jy5pbmRleE9mKHNvdXJjZVtpbmRleCsrXSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gMyBkaWdpdHMgYXJlIG9ubHkgYWxsb3dlZCB3aGVuIHN0cmluZyBzdGFydHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2l0aCAwLCAxLCAyLCAzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgnMDEyMycuaW5kZXhPZihjaCkgPj0gMCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4IDwgbGVuZ3RoICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNPY3RhbERpZ2l0KHNvdXJjZVtpbmRleF0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlID0gY29kZSAqIDggKyAnMDEyMzQ1NjcnLmluZGV4T2Yoc291cmNlW2luZGV4KytdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9IGNoO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICArK2xpbmVOdW1iZXI7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gICdcXHInICYmIHNvdXJjZVtpbmRleF0gPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdHIgKz0gY2g7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocXVvdGUgIT09ICcnKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogVG9rZW4uU3RyaW5nTGl0ZXJhbCxcbiAgICAgICAgICAgIHZhbHVlOiBzdHIsXG4gICAgICAgICAgICBvY3RhbDogb2N0YWwsXG4gICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzY2FuUmVnRXhwKCkge1xuICAgICAgICB2YXIgc3RyLCBjaCwgc3RhcnQsIHBhdHRlcm4sIGZsYWdzLCB2YWx1ZSwgY2xhc3NNYXJrZXIgPSBmYWxzZSwgcmVzdG9yZSwgdGVybWluYXRlZCA9IGZhbHNlO1xuXG4gICAgICAgIGJ1ZmZlciA9IG51bGw7XG4gICAgICAgIHNraXBDb21tZW50KCk7XG5cbiAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICBhc3NlcnQoY2ggPT09ICcvJywgJ1JlZ3VsYXIgZXhwcmVzc2lvbiBsaXRlcmFsIG11c3Qgc3RhcnQgd2l0aCBhIHNsYXNoJyk7XG4gICAgICAgIHN0ciA9IHNvdXJjZVtpbmRleCsrXTtcblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgc3RyICs9IGNoO1xuICAgICAgICAgICAgaWYgKGNsYXNzTWFya2VyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAnXScpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NNYXJrZXIgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgICAgICAvLyBFQ01BLTI2MiA3LjguNVxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVudGVybWluYXRlZFJlZ0V4cCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc3RyICs9IGNoO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICcvJykge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtaW5hdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJ1snKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTWFya2VyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVudGVybWluYXRlZFJlZ0V4cCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0ZXJtaW5hdGVkKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbnRlcm1pbmF0ZWRSZWdFeHApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXhjbHVkZSBsZWFkaW5nIGFuZCB0cmFpbGluZyBzbGFzaC5cbiAgICAgICAgcGF0dGVybiA9IHN0ci5zdWJzdHIoMSwgc3RyLmxlbmd0aCAtIDIpO1xuXG4gICAgICAgIGZsYWdzID0gJyc7XG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgaWYgKCFpc0lkZW50aWZpZXJQYXJ0KGNoKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgaWYgKGNoID09PSAnXFxcXCcgJiYgaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAndScpIHtcbiAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgcmVzdG9yZSA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICBjaCA9IHNjYW5IZXhFc2NhcGUoJ3UnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmbGFncyArPSBjaDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSAnXFxcXHUnO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICg7IHJlc3RvcmUgPCBpbmRleDsgKytyZXN0b3JlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9IHNvdXJjZVtyZXN0b3JlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4ID0gcmVzdG9yZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsYWdzICs9ICd1JztcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSAnXFxcXHUnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc3RyICs9ICdcXFxcJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZsYWdzICs9IGNoO1xuICAgICAgICAgICAgICAgIHN0ciArPSBjaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB2YWx1ZSA9IG5ldyBSZWdFeHAocGF0dGVybiwgZmxhZ3MpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbnZhbGlkUmVnRXhwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBsaXRlcmFsOiBzdHIsXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0lkZW50aWZpZXJOYW1lKHRva2VuKSB7XG4gICAgICAgIHJldHVybiB0b2tlbi50eXBlID09PSBUb2tlbi5JZGVudGlmaWVyIHx8XG4gICAgICAgICAgICB0b2tlbi50eXBlID09PSBUb2tlbi5LZXl3b3JkIHx8XG4gICAgICAgICAgICB0b2tlbi50eXBlID09PSBUb2tlbi5Cb29sZWFuTGl0ZXJhbCB8fFxuICAgICAgICAgICAgdG9rZW4udHlwZSA9PT0gVG9rZW4uTnVsbExpdGVyYWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWR2YW5jZSgpIHtcbiAgICAgICAgdmFyIGNoLCB0b2tlbjtcblxuICAgICAgICBza2lwQ29tbWVudCgpO1xuXG4gICAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uRU9GLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtpbmRleCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgdG9rZW4gPSBzY2FuUHVuY3R1YXRvcigpO1xuICAgICAgICBpZiAodHlwZW9mIHRva2VuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgICAgICB9XG5cbiAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuXG4gICAgICAgIGlmIChjaCA9PT0gJ1xcJycgfHwgY2ggPT09ICdcIicpIHtcbiAgICAgICAgICAgIHJldHVybiBzY2FuU3RyaW5nTGl0ZXJhbCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoID09PSAnLicgfHwgaXNEZWNpbWFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICByZXR1cm4gc2Nhbk51bWVyaWNMaXRlcmFsKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0b2tlbiA9IHNjYW5JZGVudGlmaWVyKCk7XG4gICAgICAgIGlmICh0eXBlb2YgdG9rZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgICAgIH1cblxuICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGV4KCkge1xuICAgICAgICB2YXIgdG9rZW47XG5cbiAgICAgICAgaWYgKGJ1ZmZlcikge1xuICAgICAgICAgICAgaW5kZXggPSBidWZmZXIucmFuZ2VbMV07XG4gICAgICAgICAgICBsaW5lTnVtYmVyID0gYnVmZmVyLmxpbmVOdW1iZXI7XG4gICAgICAgICAgICBsaW5lU3RhcnQgPSBidWZmZXIubGluZVN0YXJ0O1xuICAgICAgICAgICAgdG9rZW4gPSBidWZmZXI7XG4gICAgICAgICAgICBidWZmZXIgPSBudWxsO1xuICAgICAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgICAgICB9XG5cbiAgICAgICAgYnVmZmVyID0gbnVsbDtcbiAgICAgICAgcmV0dXJuIGFkdmFuY2UoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsb29rYWhlYWQoKSB7XG4gICAgICAgIHZhciBwb3MsIGxpbmUsIHN0YXJ0O1xuXG4gICAgICAgIGlmIChidWZmZXIgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgICAgIH1cblxuICAgICAgICBwb3MgPSBpbmRleDtcbiAgICAgICAgbGluZSA9IGxpbmVOdW1iZXI7XG4gICAgICAgIHN0YXJ0ID0gbGluZVN0YXJ0O1xuICAgICAgICBidWZmZXIgPSBhZHZhbmNlKCk7XG4gICAgICAgIGluZGV4ID0gcG9zO1xuICAgICAgICBsaW5lTnVtYmVyID0gbGluZTtcbiAgICAgICAgbGluZVN0YXJ0ID0gc3RhcnQ7XG5cbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdHJ1ZSBpZiB0aGVyZSBpcyBhIGxpbmUgdGVybWluYXRvciBiZWZvcmUgdGhlIG5leHQgdG9rZW4uXG5cbiAgICBmdW5jdGlvbiBwZWVrTGluZVRlcm1pbmF0b3IoKSB7XG4gICAgICAgIHZhciBwb3MsIGxpbmUsIHN0YXJ0LCBmb3VuZDtcblxuICAgICAgICBwb3MgPSBpbmRleDtcbiAgICAgICAgbGluZSA9IGxpbmVOdW1iZXI7XG4gICAgICAgIHN0YXJ0ID0gbGluZVN0YXJ0O1xuICAgICAgICBza2lwQ29tbWVudCgpO1xuICAgICAgICBmb3VuZCA9IGxpbmVOdW1iZXIgIT09IGxpbmU7XG4gICAgICAgIGluZGV4ID0gcG9zO1xuICAgICAgICBsaW5lTnVtYmVyID0gbGluZTtcbiAgICAgICAgbGluZVN0YXJ0ID0gc3RhcnQ7XG5cbiAgICAgICAgcmV0dXJuIGZvdW5kO1xuICAgIH1cblxuICAgIC8vIFRocm93IGFuIGV4Y2VwdGlvblxuXG4gICAgZnVuY3Rpb24gdGhyb3dFcnJvcih0b2tlbiwgbWVzc2FnZUZvcm1hdCkge1xuICAgICAgICB2YXIgZXJyb3IsXG4gICAgICAgICAgICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKSxcbiAgICAgICAgICAgIG1zZyA9IG1lc3NhZ2VGb3JtYXQucmVwbGFjZShcbiAgICAgICAgICAgICAgICAvJShcXGQpL2csXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHdob2xlLCBpbmRleCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJnc1tpbmRleF0gfHwgJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcblxuICAgICAgICBpZiAodHlwZW9mIHRva2VuLmxpbmVOdW1iZXIgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICBlcnJvciA9IG5ldyBFcnJvcignTGluZSAnICsgdG9rZW4ubGluZU51bWJlciArICc6ICcgKyBtc2cpO1xuICAgICAgICAgICAgZXJyb3IuaW5kZXggPSB0b2tlbi5yYW5nZVswXTtcbiAgICAgICAgICAgIGVycm9yLmxpbmVOdW1iZXIgPSB0b2tlbi5saW5lTnVtYmVyO1xuICAgICAgICAgICAgZXJyb3IuY29sdW1uID0gdG9rZW4ucmFuZ2VbMF0gLSBsaW5lU3RhcnQgKyAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoJ0xpbmUgJyArIGxpbmVOdW1iZXIgKyAnOiAnICsgbXNnKTtcbiAgICAgICAgICAgIGVycm9yLmluZGV4ID0gaW5kZXg7XG4gICAgICAgICAgICBlcnJvci5saW5lTnVtYmVyID0gbGluZU51bWJlcjtcbiAgICAgICAgICAgIGVycm9yLmNvbHVtbiA9IGluZGV4IC0gbGluZVN0YXJ0ICsgMTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRocm93IGVycm9yO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRocm93RXJyb3JUb2xlcmFudCgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRocm93RXJyb3IuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGV4dHJhLmVycm9ycykge1xuICAgICAgICAgICAgICAgIGV4dHJhLmVycm9ycy5wdXNoKGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICAvLyBUaHJvdyBhbiBleGNlcHRpb24gYmVjYXVzZSBvZiB0aGUgdG9rZW4uXG5cbiAgICBmdW5jdGlvbiB0aHJvd1VuZXhwZWN0ZWQodG9rZW4pIHtcbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLkVPRikge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih0b2tlbiwgTWVzc2FnZXMuVW5leHBlY3RlZEVPUyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uTnVtZXJpY0xpdGVyYWwpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3IodG9rZW4sIE1lc3NhZ2VzLlVuZXhwZWN0ZWROdW1iZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3IodG9rZW4sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRTdHJpbmcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3IodG9rZW4sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRJZGVudGlmaWVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5LZXl3b3JkKSB7XG4gICAgICAgICAgICBpZiAoaXNGdXR1cmVSZXNlcnZlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih0b2tlbiwgTWVzc2FnZXMuVW5leHBlY3RlZFJlc2VydmVkKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RyaWN0ICYmIGlzU3RyaWN0TW9kZVJlc2VydmVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQodG9rZW4sIE1lc3NhZ2VzLlN0cmljdFJlc2VydmVkV29yZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhyb3dFcnJvcih0b2tlbiwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCB0b2tlbi52YWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCb29sZWFuTGl0ZXJhbCwgTnVsbExpdGVyYWwsIG9yIFB1bmN0dWF0b3IuXG4gICAgICAgIHRocm93RXJyb3IodG9rZW4sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgdG9rZW4udmFsdWUpO1xuICAgIH1cblxuICAgIC8vIEV4cGVjdCB0aGUgbmV4dCB0b2tlbiB0byBtYXRjaCB0aGUgc3BlY2lmaWVkIHB1bmN0dWF0b3IuXG4gICAgLy8gSWYgbm90LCBhbiBleGNlcHRpb24gd2lsbCBiZSB0aHJvd24uXG5cbiAgICBmdW5jdGlvbiBleHBlY3QodmFsdWUpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbGV4KCk7XG4gICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5QdW5jdHVhdG9yIHx8IHRva2VuLnZhbHVlICE9PSB2YWx1ZSkge1xuICAgICAgICAgICAgdGhyb3dVbmV4cGVjdGVkKHRva2VuKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEV4cGVjdCB0aGUgbmV4dCB0b2tlbiB0byBtYXRjaCB0aGUgc3BlY2lmaWVkIGtleXdvcmQuXG4gICAgLy8gSWYgbm90LCBhbiBleGNlcHRpb24gd2lsbCBiZSB0aHJvd24uXG5cbiAgICBmdW5jdGlvbiBleHBlY3RLZXl3b3JkKGtleXdvcmQpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbGV4KCk7XG4gICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5LZXl3b3JkIHx8IHRva2VuLnZhbHVlICE9PSBrZXl3b3JkKSB7XG4gICAgICAgICAgICB0aHJvd1VuZXhwZWN0ZWQodG9rZW4pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIHRydWUgaWYgdGhlIG5leHQgdG9rZW4gbWF0Y2hlcyB0aGUgc3BlY2lmaWVkIHB1bmN0dWF0b3IuXG5cbiAgICBmdW5jdGlvbiBtYXRjaCh2YWx1ZSkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgcmV0dXJuIHRva2VuLnR5cGUgPT09IFRva2VuLlB1bmN0dWF0b3IgJiYgdG9rZW4udmFsdWUgPT09IHZhbHVlO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB0cnVlIGlmIHRoZSBuZXh0IHRva2VuIG1hdGNoZXMgdGhlIHNwZWNpZmllZCBrZXl3b3JkXG5cbiAgICBmdW5jdGlvbiBtYXRjaEtleXdvcmQoa2V5d29yZCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgcmV0dXJuIHRva2VuLnR5cGUgPT09IFRva2VuLktleXdvcmQgJiYgdG9rZW4udmFsdWUgPT09IGtleXdvcmQ7XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIHRydWUgaWYgdGhlIG5leHQgdG9rZW4gaXMgYW4gYXNzaWdubWVudCBvcGVyYXRvclxuXG4gICAgZnVuY3Rpb24gbWF0Y2hBc3NpZ24oKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxvb2thaGVhZCgpLFxuICAgICAgICAgICAgb3AgPSB0b2tlbi52YWx1ZTtcblxuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uUHVuY3R1YXRvcikge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvcCA9PT0gJz0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJyo9JyB8fFxuICAgICAgICAgICAgb3AgPT09ICcvPScgfHxcbiAgICAgICAgICAgIG9wID09PSAnJT0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJys9JyB8fFxuICAgICAgICAgICAgb3AgPT09ICctPScgfHxcbiAgICAgICAgICAgIG9wID09PSAnPDw9JyB8fFxuICAgICAgICAgICAgb3AgPT09ICc+Pj0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJz4+Pj0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJyY9JyB8fFxuICAgICAgICAgICAgb3AgPT09ICdePScgfHxcbiAgICAgICAgICAgIG9wID09PSAnfD0nO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbnN1bWVTZW1pY29sb24oKSB7XG4gICAgICAgIHZhciB0b2tlbiwgbGluZTtcblxuICAgICAgICAvLyBDYXRjaCB0aGUgdmVyeSBjb21tb24gY2FzZSBmaXJzdC5cbiAgICAgICAgaWYgKHNvdXJjZVtpbmRleF0gPT09ICc7Jykge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsaW5lID0gbGluZU51bWJlcjtcbiAgICAgICAgc2tpcENvbW1lbnQoKTtcbiAgICAgICAgaWYgKGxpbmVOdW1iZXIgIT09IGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaCgnOycpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5FT0YgJiYgIW1hdGNoKCd9JykpIHtcbiAgICAgICAgICAgIHRocm93VW5leHBlY3RlZCh0b2tlbik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdHJ1ZSBpZiBwcm92aWRlZCBleHByZXNzaW9uIGlzIExlZnRIYW5kU2lkZUV4cHJlc3Npb25cblxuICAgIGZ1bmN0aW9uIGlzTGVmdEhhbmRTaWRlKGV4cHIpIHtcbiAgICAgICAgcmV0dXJuIGV4cHIudHlwZSA9PT0gU3ludGF4LklkZW50aWZpZXIgfHwgZXhwci50eXBlID09PSBTeW50YXguTWVtYmVyRXhwcmVzc2lvbjtcbiAgICB9XG5cbiAgICAvLyAxMS4xLjQgQXJyYXkgSW5pdGlhbGlzZXJcblxuICAgIGZ1bmN0aW9uIHBhcnNlQXJyYXlJbml0aWFsaXNlcigpIHtcbiAgICAgICAgdmFyIGVsZW1lbnRzID0gW107XG5cbiAgICAgICAgZXhwZWN0KCdbJyk7XG5cbiAgICAgICAgd2hpbGUgKCFtYXRjaCgnXScpKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJywnKSkge1xuICAgICAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2gobnVsbCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2gocGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpKTtcblxuICAgICAgICAgICAgICAgIGlmICghbWF0Y2goJ10nKSkge1xuICAgICAgICAgICAgICAgICAgICBleHBlY3QoJywnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJ10nKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkFycmF5RXhwcmVzc2lvbixcbiAgICAgICAgICAgIGVsZW1lbnRzOiBlbGVtZW50c1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDExLjEuNSBPYmplY3QgSW5pdGlhbGlzZXJcblxuICAgIGZ1bmN0aW9uIHBhcnNlUHJvcGVydHlGdW5jdGlvbihwYXJhbSwgZmlyc3QpIHtcbiAgICAgICAgdmFyIHByZXZpb3VzU3RyaWN0LCBib2R5O1xuXG4gICAgICAgIHByZXZpb3VzU3RyaWN0ID0gc3RyaWN0O1xuICAgICAgICBib2R5ID0gcGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzKCk7XG4gICAgICAgIGlmIChmaXJzdCAmJiBzdHJpY3QgJiYgaXNSZXN0cmljdGVkV29yZChwYXJhbVswXS5uYW1lKSkge1xuICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KGZpcnN0LCBNZXNzYWdlcy5TdHJpY3RQYXJhbU5hbWUpO1xuICAgICAgICB9XG4gICAgICAgIHN0cmljdCA9IHByZXZpb3VzU3RyaWN0O1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguRnVuY3Rpb25FeHByZXNzaW9uLFxuICAgICAgICAgICAgaWQ6IG51bGwsXG4gICAgICAgICAgICBwYXJhbXM6IHBhcmFtLFxuICAgICAgICAgICAgZGVmYXVsdHM6IFtdLFxuICAgICAgICAgICAgYm9keTogYm9keSxcbiAgICAgICAgICAgIHJlc3Q6IG51bGwsXG4gICAgICAgICAgICBnZW5lcmF0b3I6IGZhbHNlLFxuICAgICAgICAgICAgZXhwcmVzc2lvbjogZmFsc2VcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZU9iamVjdFByb3BlcnR5S2V5KCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsZXgoKTtcblxuICAgICAgICAvLyBOb3RlOiBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBvbmx5IGZyb20gcGFyc2VPYmplY3RQcm9wZXJ0eSgpLCB3aGVyZVxuICAgICAgICAvLyBFT0YgYW5kIFB1bmN0dWF0b3IgdG9rZW5zIGFyZSBhbHJlYWR5IGZpbHRlcmVkIG91dC5cblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uU3RyaW5nTGl0ZXJhbCB8fCB0b2tlbi50eXBlID09PSBUb2tlbi5OdW1lcmljTGl0ZXJhbCkge1xuICAgICAgICAgICAgaWYgKHN0cmljdCAmJiB0b2tlbi5vY3RhbCkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh0b2tlbiwgTWVzc2FnZXMuU3RyaWN0T2N0YWxMaXRlcmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVMaXRlcmFsKHRva2VuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgIG5hbWU6IHRva2VuLnZhbHVlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VPYmplY3RQcm9wZXJ0eSgpIHtcbiAgICAgICAgdmFyIHRva2VuLCBrZXksIGlkLCBwYXJhbTtcblxuICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5JZGVudGlmaWVyKSB7XG5cbiAgICAgICAgICAgIGlkID0gcGFyc2VPYmplY3RQcm9wZXJ0eUtleSgpO1xuXG4gICAgICAgICAgICAvLyBQcm9wZXJ0eSBBc3NpZ25tZW50OiBHZXR0ZXIgYW5kIFNldHRlci5cblxuICAgICAgICAgICAgaWYgKHRva2VuLnZhbHVlID09PSAnZ2V0JyAmJiAhbWF0Y2goJzonKSkge1xuICAgICAgICAgICAgICAgIGtleSA9IHBhcnNlT2JqZWN0UHJvcGVydHlLZXkoKTtcbiAgICAgICAgICAgICAgICBleHBlY3QoJygnKTtcbiAgICAgICAgICAgICAgICBleHBlY3QoJyknKTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguUHJvcGVydHksXG4gICAgICAgICAgICAgICAgICAgIGtleToga2V5LFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcGFyc2VQcm9wZXJ0eUZ1bmN0aW9uKFtdKSxcbiAgICAgICAgICAgICAgICAgICAga2luZDogJ2dldCdcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0b2tlbi52YWx1ZSA9PT0gJ3NldCcgJiYgIW1hdGNoKCc6JykpIHtcbiAgICAgICAgICAgICAgICBrZXkgPSBwYXJzZU9iamVjdFByb3BlcnR5S2V5KCk7XG4gICAgICAgICAgICAgICAgZXhwZWN0KCcoJyk7XG4gICAgICAgICAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uSWRlbnRpZmllcikge1xuICAgICAgICAgICAgICAgICAgICBleHBlY3QoJyknKTtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sIHRva2VuLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Qcm9wZXJ0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleToga2V5LFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHBhcnNlUHJvcGVydHlGdW5jdGlvbihbXSksXG4gICAgICAgICAgICAgICAgICAgICAgICBraW5kOiAnc2V0J1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtID0gWyBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcigpIF07XG4gICAgICAgICAgICAgICAgICAgIGV4cGVjdCgnKScpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlByb3BlcnR5LFxuICAgICAgICAgICAgICAgICAgICAgICAga2V5OiBrZXksXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcGFyc2VQcm9wZXJ0eUZ1bmN0aW9uKHBhcmFtLCB0b2tlbiksXG4gICAgICAgICAgICAgICAgICAgICAgICBraW5kOiAnc2V0J1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXhwZWN0KCc6Jyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlByb3BlcnR5LFxuICAgICAgICAgICAgICAgICAgICBrZXk6IGlkLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpLFxuICAgICAgICAgICAgICAgICAgICBraW5kOiAnaW5pdCdcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLkVPRiB8fCB0b2tlbi50eXBlID09PSBUb2tlbi5QdW5jdHVhdG9yKSB7XG4gICAgICAgICAgICB0aHJvd1VuZXhwZWN0ZWQodG9rZW4pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAga2V5ID0gcGFyc2VPYmplY3RQcm9wZXJ0eUtleSgpO1xuICAgICAgICAgICAgZXhwZWN0KCc6Jyk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Qcm9wZXJ0eSxcbiAgICAgICAgICAgICAgICBrZXk6IGtleSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpLFxuICAgICAgICAgICAgICAgIGtpbmQ6ICdpbml0J1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlT2JqZWN0SW5pdGlhbGlzZXIoKSB7XG4gICAgICAgIHZhciBwcm9wZXJ0aWVzID0gW10sIHByb3BlcnR5LCBuYW1lLCBraW5kLCBtYXAgPSB7fSwgdG9TdHJpbmcgPSBTdHJpbmc7XG5cbiAgICAgICAgZXhwZWN0KCd7Jyk7XG5cbiAgICAgICAgd2hpbGUgKCFtYXRjaCgnfScpKSB7XG4gICAgICAgICAgICBwcm9wZXJ0eSA9IHBhcnNlT2JqZWN0UHJvcGVydHkoKTtcblxuICAgICAgICAgICAgaWYgKHByb3BlcnR5LmtleS50eXBlID09PSBTeW50YXguSWRlbnRpZmllcikge1xuICAgICAgICAgICAgICAgIG5hbWUgPSBwcm9wZXJ0eS5rZXkubmFtZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9IHRvU3RyaW5nKHByb3BlcnR5LmtleS52YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBraW5kID0gKHByb3BlcnR5LmtpbmQgPT09ICdpbml0JykgPyBQcm9wZXJ0eUtpbmQuRGF0YSA6IChwcm9wZXJ0eS5raW5kID09PSAnZ2V0JykgPyBQcm9wZXJ0eUtpbmQuR2V0IDogUHJvcGVydHlLaW5kLlNldDtcbiAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobWFwLCBuYW1lKSkge1xuICAgICAgICAgICAgICAgIGlmIChtYXBbbmFtZV0gPT09IFByb3BlcnR5S2luZC5EYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdHJpY3QgJiYga2luZCA9PT0gUHJvcGVydHlLaW5kLkRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuU3RyaWN0RHVwbGljYXRlUHJvcGVydHkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtpbmQgIT09IFByb3BlcnR5S2luZC5EYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLkFjY2Vzc29yRGF0YVByb3BlcnR5KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChraW5kID09PSBQcm9wZXJ0eUtpbmQuRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5BY2Nlc3NvckRhdGFQcm9wZXJ0eSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobWFwW25hbWVdICYga2luZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5BY2Nlc3NvckdldFNldCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbWFwW25hbWVdIHw9IGtpbmQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG1hcFtuYW1lXSA9IGtpbmQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHByb3BlcnRpZXMucHVzaChwcm9wZXJ0eSk7XG5cbiAgICAgICAgICAgIGlmICghbWF0Y2goJ30nKSkge1xuICAgICAgICAgICAgICAgIGV4cGVjdCgnLCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCd9Jyk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5PYmplY3RFeHByZXNzaW9uLFxuICAgICAgICAgICAgcHJvcGVydGllczogcHJvcGVydGllc1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDExLjEuNiBUaGUgR3JvdXBpbmcgT3BlcmF0b3JcblxuICAgIGZ1bmN0aW9uIHBhcnNlR3JvdXBFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwcjtcblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICBleHByID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgZXhwZWN0KCcpJyk7XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG5cbiAgICAvLyAxMS4xIFByaW1hcnkgRXhwcmVzc2lvbnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlUHJpbWFyeUV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxvb2thaGVhZCgpLFxuICAgICAgICAgICAgdHlwZSA9IHRva2VuLnR5cGU7XG5cbiAgICAgICAgaWYgKHR5cGUgPT09IFRva2VuLklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgbmFtZTogbGV4KCkudmFsdWVcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZSA9PT0gVG9rZW4uU3RyaW5nTGl0ZXJhbCB8fCB0eXBlID09PSBUb2tlbi5OdW1lcmljTGl0ZXJhbCkge1xuICAgICAgICAgICAgaWYgKHN0cmljdCAmJiB0b2tlbi5vY3RhbCkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh0b2tlbiwgTWVzc2FnZXMuU3RyaWN0T2N0YWxMaXRlcmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVMaXRlcmFsKGxleCgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlID09PSBUb2tlbi5LZXl3b3JkKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2hLZXl3b3JkKCd0aGlzJykpIHtcbiAgICAgICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguVGhpc0V4cHJlc3Npb25cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobWF0Y2hLZXl3b3JkKCdmdW5jdGlvbicpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRnVuY3Rpb25FeHByZXNzaW9uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZSA9PT0gVG9rZW4uQm9vbGVhbkxpdGVyYWwpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgdG9rZW4udmFsdWUgPSAodG9rZW4udmFsdWUgPT09ICd0cnVlJyk7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlTGl0ZXJhbCh0b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZSA9PT0gVG9rZW4uTnVsbExpdGVyYWwpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgdG9rZW4udmFsdWUgPSBudWxsO1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUxpdGVyYWwodG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoKCdbJykpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZUFycmF5SW5pdGlhbGlzZXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaCgneycpKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VPYmplY3RJbml0aWFsaXNlcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoKCcoJykpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZUdyb3VwRXhwcmVzc2lvbigpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoKCcvJykgfHwgbWF0Y2goJy89JykpIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVMaXRlcmFsKHNjYW5SZWdFeHAoKSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhyb3dVbmV4cGVjdGVkKGxleCgpKTtcbiAgICB9XG5cbiAgICAvLyAxMS4yIExlZnQtSGFuZC1TaWRlIEV4cHJlc3Npb25zXG5cbiAgICBmdW5jdGlvbiBwYXJzZUFyZ3VtZW50cygpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXTtcblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICBpZiAoIW1hdGNoKCcpJykpIHtcbiAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGFyZ3MucHVzaChwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCkpO1xuICAgICAgICAgICAgICAgIGlmIChtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBleHBlY3QoJywnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIHJldHVybiBhcmdzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eSgpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbGV4KCk7XG5cbiAgICAgICAgaWYgKCFpc0lkZW50aWZpZXJOYW1lKHRva2VuKSkge1xuICAgICAgICAgICAgdGhyb3dVbmV4cGVjdGVkKHRva2VuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgIG5hbWU6IHRva2VuLnZhbHVlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VOb25Db21wdXRlZE1lbWJlcigpIHtcbiAgICAgICAgZXhwZWN0KCcuJyk7XG5cbiAgICAgICAgcmV0dXJuIHBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlQ29tcHV0ZWRNZW1iZXIoKSB7XG4gICAgICAgIHZhciBleHByO1xuXG4gICAgICAgIGV4cGVjdCgnWycpO1xuXG4gICAgICAgIGV4cHIgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBleHBlY3QoJ10nKTtcblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZU5ld0V4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ25ldycpO1xuXG4gICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguTmV3RXhwcmVzc2lvbixcbiAgICAgICAgICAgIGNhbGxlZTogcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uKCksXG4gICAgICAgICAgICAnYXJndW1lbnRzJzogW11cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAobWF0Y2goJygnKSkge1xuICAgICAgICAgICAgZXhwclsnYXJndW1lbnRzJ10gPSBwYXJzZUFyZ3VtZW50cygpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsKCkge1xuICAgICAgICB2YXIgZXhwcjtcblxuICAgICAgICBleHByID0gbWF0Y2hLZXl3b3JkKCduZXcnKSA/IHBhcnNlTmV3RXhwcmVzc2lvbigpIDogcGFyc2VQcmltYXJ5RXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnLicpIHx8IG1hdGNoKCdbJykgfHwgbWF0Y2goJygnKSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoKCcoJykpIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQ2FsbEV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNhbGxlZTogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgJ2FyZ3VtZW50cyc6IHBhcnNlQXJndW1lbnRzKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtYXRjaCgnWycpKSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNvbXB1dGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwYXJzZUNvbXB1dGVkTWVtYmVyKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgY29tcHV0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwYXJzZU5vbkNvbXB1dGVkTWVtYmVyKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiBwYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByO1xuXG4gICAgICAgIGV4cHIgPSBtYXRjaEtleXdvcmQoJ25ldycpID8gcGFyc2VOZXdFeHByZXNzaW9uKCkgOiBwYXJzZVByaW1hcnlFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCcuJykgfHwgbWF0Y2goJ1snKSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoKCdbJykpIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgY29tcHV0ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdDogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHBhcnNlQ29tcHV0ZWRNZW1iZXIoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjb21wdXRlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdDogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHBhcnNlTm9uQ29tcHV0ZWRNZW1iZXIoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS4zIFBvc3RmaXggRXhwcmVzc2lvbnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlUG9zdGZpeEV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByID0gcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsKCksIHRva2VuO1xuXG4gICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5QdW5jdHVhdG9yKSB7XG4gICAgICAgICAgICByZXR1cm4gZXhwcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgobWF0Y2goJysrJykgfHwgbWF0Y2goJy0tJykpICYmICFwZWVrTGluZVRlcm1pbmF0b3IoKSkge1xuICAgICAgICAgICAgLy8gMTEuMy4xLCAxMS4zLjJcbiAgICAgICAgICAgIGlmIChzdHJpY3QgJiYgZXhwci50eXBlID09PSBTeW50YXguSWRlbnRpZmllciAmJiBpc1Jlc3RyaWN0ZWRXb3JkKGV4cHIubmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLlN0cmljdExIU1Bvc3RmaXgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWlzTGVmdEhhbmRTaWRlKGV4cHIpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSW52YWxpZExIU0luQXNzaWdubWVudCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlVwZGF0ZUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IGxleCgpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50OiBleHByLFxuICAgICAgICAgICAgICAgIHByZWZpeDogZmFsc2VcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS40IFVuYXJ5IE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VVbmFyeUV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciB0b2tlbiwgZXhwcjtcblxuICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uUHVuY3R1YXRvciAmJiB0b2tlbi50eXBlICE9PSBUb2tlbi5LZXl3b3JkKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VQb3N0Zml4RXhwcmVzc2lvbigpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoKCcrKycpIHx8IG1hdGNoKCctLScpKSB7XG4gICAgICAgICAgICB0b2tlbiA9IGxleCgpO1xuICAgICAgICAgICAgZXhwciA9IHBhcnNlVW5hcnlFeHByZXNzaW9uKCk7XG4gICAgICAgICAgICAvLyAxMS40LjQsIDExLjQuNVxuICAgICAgICAgICAgaWYgKHN0cmljdCAmJiBleHByLnR5cGUgPT09IFN5bnRheC5JZGVudGlmaWVyICYmIGlzUmVzdHJpY3RlZFdvcmQoZXhwci5uYW1lKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuU3RyaWN0TEhTUHJlZml4KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFpc0xlZnRIYW5kU2lkZShleHByKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLkludmFsaWRMSFNJbkFzc2lnbm1lbnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5VcGRhdGVFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiB0b2tlbi52YWx1ZSxcbiAgICAgICAgICAgICAgICBhcmd1bWVudDogZXhwcixcbiAgICAgICAgICAgICAgICBwcmVmaXg6IHRydWVcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gZXhwcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaCgnKycpIHx8IG1hdGNoKCctJykgfHwgbWF0Y2goJ34nKSB8fCBtYXRjaCgnIScpKSB7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5VbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IGxleCgpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50OiBwYXJzZVVuYXJ5RXhwcmVzc2lvbigpLFxuICAgICAgICAgICAgICAgIHByZWZpeDogdHJ1ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBleHByO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoS2V5d29yZCgnZGVsZXRlJykgfHwgbWF0Y2hLZXl3b3JkKCd2b2lkJykgfHwgbWF0Y2hLZXl3b3JkKCd0eXBlb2YnKSkge1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguVW5hcnlFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBsZXgoKS52YWx1ZSxcbiAgICAgICAgICAgICAgICBhcmd1bWVudDogcGFyc2VVbmFyeUV4cHJlc3Npb24oKSxcbiAgICAgICAgICAgICAgICBwcmVmaXg6IHRydWVcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAoc3RyaWN0ICYmIGV4cHIub3BlcmF0b3IgPT09ICdkZWxldGUnICYmIGV4cHIuYXJndW1lbnQudHlwZSA9PT0gU3ludGF4LklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLlN0cmljdERlbGV0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZXhwcjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwYXJzZVBvc3RmaXhFeHByZXNzaW9uKCk7XG4gICAgfVxuXG4gICAgLy8gMTEuNSBNdWx0aXBsaWNhdGl2ZSBPcGVyYXRvcnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlTXVsdGlwbGljYXRpdmVFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlVW5hcnlFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCcqJykgfHwgbWF0Y2goJy8nKSB8fCBtYXRjaCgnJScpKSB7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBsZXgoKS52YWx1ZSxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZVVuYXJ5RXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgLy8gMTEuNiBBZGRpdGl2ZSBPcGVyYXRvcnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlQWRkaXRpdmVFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlTXVsdGlwbGljYXRpdmVFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCcrJykgfHwgbWF0Y2goJy0nKSkge1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VNdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjcgQml0d2lzZSBTaGlmdCBPcGVyYXRvcnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlU2hpZnRFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlQWRkaXRpdmVFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCc8PCcpIHx8IG1hdGNoKCc+PicpIHx8IG1hdGNoKCc+Pj4nKSkge1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VBZGRpdGl2ZUV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cbiAgICAvLyAxMS44IFJlbGF0aW9uYWwgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZVJlbGF0aW9uYWxFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciwgcHJldmlvdXNBbGxvd0luO1xuXG4gICAgICAgIHByZXZpb3VzQWxsb3dJbiA9IHN0YXRlLmFsbG93SW47XG4gICAgICAgIHN0YXRlLmFsbG93SW4gPSB0cnVlO1xuXG4gICAgICAgIGV4cHIgPSBwYXJzZVNoaWZ0RXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnPCcpIHx8IG1hdGNoKCc+JykgfHwgbWF0Y2goJzw9JykgfHwgbWF0Y2goJz49JykgfHwgKHByZXZpb3VzQWxsb3dJbiAmJiBtYXRjaEtleXdvcmQoJ2luJykpIHx8IG1hdGNoS2V5d29yZCgnaW5zdGFuY2VvZicpKSB7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBsZXgoKS52YWx1ZSxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZVNoaWZ0RXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgc3RhdGUuYWxsb3dJbiA9IHByZXZpb3VzQWxsb3dJbjtcbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgLy8gMTEuOSBFcXVhbGl0eSBPcGVyYXRvcnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlRXF1YWxpdHlFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJz09JykgfHwgbWF0Y2goJyE9JykgfHwgbWF0Y2goJz09PScpIHx8IG1hdGNoKCchPT0nKSkge1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VSZWxhdGlvbmFsRXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgLy8gMTEuMTAgQmluYXJ5IEJpdHdpc2UgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZUJpdHdpc2VBTkRFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlRXF1YWxpdHlFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCcmJykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogJyYnLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlRXF1YWxpdHlFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUJpdHdpc2VYT1JFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlQml0d2lzZUFOREV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJ14nKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiAnXicsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VCaXR3aXNlQU5ERXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlQml0d2lzZVhPUkV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJ3wnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiAnfCcsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgLy8gMTEuMTEgQmluYXJ5IExvZ2ljYWwgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZUxvZ2ljYWxBTkRFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlQml0d2lzZU9SRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnJiYnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Mb2dpY2FsRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogJyYmJyxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZUJpdHdpc2VPUkV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlTG9naWNhbE9SRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUxvZ2ljYWxBTkRFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCd8fCcpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkxvZ2ljYWxFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiAnfHwnLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlTG9naWNhbEFOREV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjEyIENvbmRpdGlvbmFsIE9wZXJhdG9yXG5cbiAgICBmdW5jdGlvbiBwYXJzZUNvbmRpdGlvbmFsRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIsIHByZXZpb3VzQWxsb3dJbiwgY29uc2VxdWVudDtcblxuICAgICAgICBleHByID0gcGFyc2VMb2dpY2FsT1JFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgaWYgKG1hdGNoKCc/JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgcHJldmlvdXNBbGxvd0luID0gc3RhdGUuYWxsb3dJbjtcbiAgICAgICAgICAgIHN0YXRlLmFsbG93SW4gPSB0cnVlO1xuICAgICAgICAgICAgY29uc2VxdWVudCA9IHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgIHN0YXRlLmFsbG93SW4gPSBwcmV2aW91c0FsbG93SW47XG4gICAgICAgICAgICBleHBlY3QoJzonKTtcblxuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQ29uZGl0aW9uYWxFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIHRlc3Q6IGV4cHIsXG4gICAgICAgICAgICAgICAgY29uc2VxdWVudDogY29uc2VxdWVudCxcbiAgICAgICAgICAgICAgICBhbHRlcm5hdGU6IHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjEzIEFzc2lnbm1lbnQgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgdG9rZW4sIGV4cHI7XG5cbiAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgZXhwciA9IHBhcnNlQ29uZGl0aW9uYWxFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgaWYgKG1hdGNoQXNzaWduKCkpIHtcbiAgICAgICAgICAgIC8vIExlZnRIYW5kU2lkZUV4cHJlc3Npb25cbiAgICAgICAgICAgIGlmICghaXNMZWZ0SGFuZFNpZGUoZXhwcikpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbnZhbGlkTEhTSW5Bc3NpZ25tZW50KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gMTEuMTMuMVxuICAgICAgICAgICAgaWYgKHN0cmljdCAmJiBleHByLnR5cGUgPT09IFN5bnRheC5JZGVudGlmaWVyICYmIGlzUmVzdHJpY3RlZFdvcmQoZXhwci5uYW1lKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh0b2tlbiwgTWVzc2FnZXMuU3RyaWN0TEhTQXNzaWdubWVudCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkFzc2lnbm1lbnRFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBsZXgoKS52YWx1ZSxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS4xNCBDb21tYSBPcGVyYXRvclxuXG4gICAgZnVuY3Rpb24gcGFyc2VFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKTtcblxuICAgICAgICBpZiAobWF0Y2goJywnKSkge1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguU2VxdWVuY2VFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIGV4cHJlc3Npb25zOiBbIGV4cHIgXVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFtYXRjaCgnLCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgICAgICBleHByLmV4cHJlc3Npb25zLnB1c2gocGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDEyLjEgQmxvY2tcblxuICAgIGZ1bmN0aW9uIHBhcnNlU3RhdGVtZW50TGlzdCgpIHtcbiAgICAgICAgdmFyIGxpc3QgPSBbXSxcbiAgICAgICAgICAgIHN0YXRlbWVudDtcblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaCgnfScpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGF0ZW1lbnQgPSBwYXJzZVNvdXJjZUVsZW1lbnQoKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc3RhdGVtZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGlzdC5wdXNoKHN0YXRlbWVudCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbGlzdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUJsb2NrKCkge1xuICAgICAgICB2YXIgYmxvY2s7XG5cbiAgICAgICAgZXhwZWN0KCd7Jyk7XG5cbiAgICAgICAgYmxvY2sgPSBwYXJzZVN0YXRlbWVudExpc3QoKTtcblxuICAgICAgICBleHBlY3QoJ30nKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkJsb2NrU3RhdGVtZW50LFxuICAgICAgICAgICAgYm9keTogYmxvY2tcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi4yIFZhcmlhYmxlIFN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxleCgpO1xuXG4gICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICB0aHJvd1VuZXhwZWN0ZWQodG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxuICAgICAgICAgICAgbmFtZTogdG9rZW4udmFsdWVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb24oa2luZCkge1xuICAgICAgICB2YXIgaWQgPSBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcigpLFxuICAgICAgICAgICAgaW5pdCA9IG51bGw7XG5cbiAgICAgICAgLy8gMTIuMi4xXG4gICAgICAgIGlmIChzdHJpY3QgJiYgaXNSZXN0cmljdGVkV29yZChpZC5uYW1lKSkge1xuICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5TdHJpY3RWYXJOYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChraW5kID09PSAnY29uc3QnKSB7XG4gICAgICAgICAgICBleHBlY3QoJz0nKTtcbiAgICAgICAgICAgIGluaXQgPSBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCk7XG4gICAgICAgIH0gZWxzZSBpZiAobWF0Y2goJz0nKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICBpbml0ID0gcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5WYXJpYWJsZURlY2xhcmF0b3IsXG4gICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICBpbml0OiBpbml0XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uTGlzdChraW5kKSB7XG4gICAgICAgIHZhciBsaXN0ID0gW107XG5cbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgbGlzdC5wdXNoKHBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbihraW5kKSk7XG4gICAgICAgICAgICBpZiAoIW1hdGNoKCcsJykpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICB9IHdoaWxlIChpbmRleCA8IGxlbmd0aCk7XG5cbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VWYXJpYWJsZVN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIGRlY2xhcmF0aW9ucztcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCd2YXInKTtcblxuICAgICAgICBkZWNsYXJhdGlvbnMgPSBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb25MaXN0KCk7XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguVmFyaWFibGVEZWNsYXJhdGlvbixcbiAgICAgICAgICAgIGRlY2xhcmF0aW9uczogZGVjbGFyYXRpb25zLFxuICAgICAgICAgICAga2luZDogJ3ZhcidcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBraW5kIG1heSBiZSBgY29uc3RgIG9yIGBsZXRgXG4gICAgLy8gQm90aCBhcmUgZXhwZXJpbWVudGFsIGFuZCBub3QgaW4gdGhlIHNwZWNpZmljYXRpb24geWV0LlxuICAgIC8vIHNlZSBodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OmNvbnN0XG4gICAgLy8gYW5kIGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWhhcm1vbnk6bGV0XG4gICAgZnVuY3Rpb24gcGFyc2VDb25zdExldERlY2xhcmF0aW9uKGtpbmQpIHtcbiAgICAgICAgdmFyIGRlY2xhcmF0aW9ucztcblxuICAgICAgICBleHBlY3RLZXl3b3JkKGtpbmQpO1xuXG4gICAgICAgIGRlY2xhcmF0aW9ucyA9IHBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbkxpc3Qoa2luZCk7XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguVmFyaWFibGVEZWNsYXJhdGlvbixcbiAgICAgICAgICAgIGRlY2xhcmF0aW9uczogZGVjbGFyYXRpb25zLFxuICAgICAgICAgICAga2luZDoga2luZFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjMgRW1wdHkgU3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZUVtcHR5U3RhdGVtZW50KCkge1xuICAgICAgICBleHBlY3QoJzsnKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkVtcHR5U3RhdGVtZW50XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuNCBFeHByZXNzaW9uIFN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VFeHByZXNzaW9uU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkV4cHJlc3Npb25TdGF0ZW1lbnQsXG4gICAgICAgICAgICBleHByZXNzaW9uOiBleHByXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuNSBJZiBzdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlSWZTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciB0ZXN0LCBjb25zZXF1ZW50LCBhbHRlcm5hdGU7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnaWYnKTtcblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICB0ZXN0ID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgZXhwZWN0KCcpJyk7XG5cbiAgICAgICAgY29uc2VxdWVudCA9IHBhcnNlU3RhdGVtZW50KCk7XG5cbiAgICAgICAgaWYgKG1hdGNoS2V5d29yZCgnZWxzZScpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIGFsdGVybmF0ZSA9IHBhcnNlU3RhdGVtZW50KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhbHRlcm5hdGUgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZlN0YXRlbWVudCxcbiAgICAgICAgICAgIHRlc3Q6IHRlc3QsXG4gICAgICAgICAgICBjb25zZXF1ZW50OiBjb25zZXF1ZW50LFxuICAgICAgICAgICAgYWx0ZXJuYXRlOiBhbHRlcm5hdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi42IEl0ZXJhdGlvbiBTdGF0ZW1lbnRzXG5cbiAgICBmdW5jdGlvbiBwYXJzZURvV2hpbGVTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciBib2R5LCB0ZXN0LCBvbGRJbkl0ZXJhdGlvbjtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdkbycpO1xuXG4gICAgICAgIG9sZEluSXRlcmF0aW9uID0gc3RhdGUuaW5JdGVyYXRpb247XG4gICAgICAgIHN0YXRlLmluSXRlcmF0aW9uID0gdHJ1ZTtcblxuICAgICAgICBib2R5ID0gcGFyc2VTdGF0ZW1lbnQoKTtcblxuICAgICAgICBzdGF0ZS5pbkl0ZXJhdGlvbiA9IG9sZEluSXRlcmF0aW9uO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ3doaWxlJyk7XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgdGVzdCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIGlmIChtYXRjaCgnOycpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguRG9XaGlsZVN0YXRlbWVudCxcbiAgICAgICAgICAgIGJvZHk6IGJvZHksXG4gICAgICAgICAgICB0ZXN0OiB0ZXN0XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VXaGlsZVN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIHRlc3QsIGJvZHksIG9sZEluSXRlcmF0aW9uO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ3doaWxlJyk7XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgdGVzdCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIG9sZEluSXRlcmF0aW9uID0gc3RhdGUuaW5JdGVyYXRpb247XG4gICAgICAgIHN0YXRlLmluSXRlcmF0aW9uID0gdHJ1ZTtcblxuICAgICAgICBib2R5ID0gcGFyc2VTdGF0ZW1lbnQoKTtcblxuICAgICAgICBzdGF0ZS5pbkl0ZXJhdGlvbiA9IG9sZEluSXRlcmF0aW9uO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguV2hpbGVTdGF0ZW1lbnQsXG4gICAgICAgICAgICB0ZXN0OiB0ZXN0LFxuICAgICAgICAgICAgYm9keTogYm9keVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlRm9yVmFyaWFibGVEZWNsYXJhdGlvbigpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbGV4KCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5WYXJpYWJsZURlY2xhcmF0aW9uLFxuICAgICAgICAgICAgZGVjbGFyYXRpb25zOiBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb25MaXN0KCksXG4gICAgICAgICAgICBraW5kOiB0b2tlbi52YWx1ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlRm9yU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgaW5pdCwgdGVzdCwgdXBkYXRlLCBsZWZ0LCByaWdodCwgYm9keSwgb2xkSW5JdGVyYXRpb247XG5cbiAgICAgICAgaW5pdCA9IHRlc3QgPSB1cGRhdGUgPSBudWxsO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ2ZvcicpO1xuXG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIGlmIChtYXRjaCgnOycpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ3ZhcicpIHx8IG1hdGNoS2V5d29yZCgnbGV0JykpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5hbGxvd0luID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgaW5pdCA9IHBhcnNlRm9yVmFyaWFibGVEZWNsYXJhdGlvbigpO1xuICAgICAgICAgICAgICAgIHN0YXRlLmFsbG93SW4gPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgaWYgKGluaXQuZGVjbGFyYXRpb25zLmxlbmd0aCA9PT0gMSAmJiBtYXRjaEtleXdvcmQoJ2luJykpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICAgICAgICAgIGxlZnQgPSBpbml0O1xuICAgICAgICAgICAgICAgICAgICByaWdodCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgICAgICAgICBpbml0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN0YXRlLmFsbG93SW4gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBpbml0ID0gcGFyc2VFeHByZXNzaW9uKCk7XG4gICAgICAgICAgICAgICAgc3RhdGUuYWxsb3dJbiA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICBpZiAobWF0Y2hLZXl3b3JkKCdpbicpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIExlZnRIYW5kU2lkZUV4cHJlc3Npb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0xlZnRIYW5kU2lkZShpbml0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSW52YWxpZExIU0luRm9ySW4pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICAgICAgICAgIGxlZnQgPSBpbml0O1xuICAgICAgICAgICAgICAgICAgICByaWdodCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgICAgICAgICBpbml0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgbGVmdCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBleHBlY3QoJzsnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgbGVmdCA9PT0gJ3VuZGVmaW5lZCcpIHtcblxuICAgICAgICAgICAgaWYgKCFtYXRjaCgnOycpKSB7XG4gICAgICAgICAgICAgICAgdGVzdCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZXhwZWN0KCc7Jyk7XG5cbiAgICAgICAgICAgIGlmICghbWF0Y2goJyknKSkge1xuICAgICAgICAgICAgICAgIHVwZGF0ZSA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCcpJyk7XG5cbiAgICAgICAgb2xkSW5JdGVyYXRpb24gPSBzdGF0ZS5pbkl0ZXJhdGlvbjtcbiAgICAgICAgc3RhdGUuaW5JdGVyYXRpb24gPSB0cnVlO1xuXG4gICAgICAgIGJvZHkgPSBwYXJzZVN0YXRlbWVudCgpO1xuXG4gICAgICAgIHN0YXRlLmluSXRlcmF0aW9uID0gb2xkSW5JdGVyYXRpb247XG5cbiAgICAgICAgaWYgKHR5cGVvZiBsZWZ0ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguRm9yU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgIGluaXQ6IGluaXQsXG4gICAgICAgICAgICAgICAgdGVzdDogdGVzdCxcbiAgICAgICAgICAgICAgICB1cGRhdGU6IHVwZGF0ZSxcbiAgICAgICAgICAgICAgICBib2R5OiBib2R5XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Gb3JJblN0YXRlbWVudCxcbiAgICAgICAgICAgIGxlZnQ6IGxlZnQsXG4gICAgICAgICAgICByaWdodDogcmlnaHQsXG4gICAgICAgICAgICBib2R5OiBib2R5LFxuICAgICAgICAgICAgZWFjaDogZmFsc2VcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi43IFRoZSBjb250aW51ZSBzdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlQ29udGludWVTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciB0b2tlbiwgbGFiZWwgPSBudWxsO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ2NvbnRpbnVlJyk7XG5cbiAgICAgICAgLy8gT3B0aW1pemUgdGhlIG1vc3QgY29tbW9uIGZvcm06ICdjb250aW51ZTsnLlxuICAgICAgICBpZiAoc291cmNlW2luZGV4XSA9PT0gJzsnKSB7XG4gICAgICAgICAgICBsZXgoKTtcblxuICAgICAgICAgICAgaWYgKCFzdGF0ZS5pbkl0ZXJhdGlvbikge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLklsbGVnYWxDb250aW51ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkNvbnRpbnVlU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgIGxhYmVsOiBudWxsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBlZWtMaW5lVGVybWluYXRvcigpKSB7XG4gICAgICAgICAgICBpZiAoIXN0YXRlLmluSXRlcmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSWxsZWdhbENvbnRpbnVlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQ29udGludWVTdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgbGFiZWw6IG51bGxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uSWRlbnRpZmllcikge1xuICAgICAgICAgICAgbGFiZWwgPSBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcigpO1xuXG4gICAgICAgICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzdGF0ZS5sYWJlbFNldCwgbGFiZWwubmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5Vbmtub3duTGFiZWwsIGxhYmVsLm5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIGlmIChsYWJlbCA9PT0gbnVsbCAmJiAhc3RhdGUuaW5JdGVyYXRpb24pIHtcbiAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLklsbGVnYWxDb250aW51ZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkNvbnRpbnVlU3RhdGVtZW50LFxuICAgICAgICAgICAgbGFiZWw6IGxhYmVsXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuOCBUaGUgYnJlYWsgc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZUJyZWFrU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgdG9rZW4sIGxhYmVsID0gbnVsbDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdicmVhaycpO1xuXG4gICAgICAgIC8vIE9wdGltaXplIHRoZSBtb3N0IGNvbW1vbiBmb3JtOiAnYnJlYWs7Jy5cbiAgICAgICAgaWYgKHNvdXJjZVtpbmRleF0gPT09ICc7Jykge1xuICAgICAgICAgICAgbGV4KCk7XG5cbiAgICAgICAgICAgIGlmICghKHN0YXRlLmluSXRlcmF0aW9uIHx8IHN0YXRlLmluU3dpdGNoKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLklsbGVnYWxCcmVhayk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJyZWFrU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgIGxhYmVsOiBudWxsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBlZWtMaW5lVGVybWluYXRvcigpKSB7XG4gICAgICAgICAgICBpZiAoIShzdGF0ZS5pbkl0ZXJhdGlvbiB8fCBzdGF0ZS5pblN3aXRjaCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbGxlZ2FsQnJlYWspO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CcmVha1N0YXRlbWVudCxcbiAgICAgICAgICAgICAgICBsYWJlbDogbnVsbFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICBsYWJlbCA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCk7XG5cbiAgICAgICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHN0YXRlLmxhYmVsU2V0LCBsYWJlbC5uYW1lKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVua25vd25MYWJlbCwgbGFiZWwubmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdW1lU2VtaWNvbG9uKCk7XG5cbiAgICAgICAgaWYgKGxhYmVsID09PSBudWxsICYmICEoc3RhdGUuaW5JdGVyYXRpb24gfHwgc3RhdGUuaW5Td2l0Y2gpKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbGxlZ2FsQnJlYWspO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CcmVha1N0YXRlbWVudCxcbiAgICAgICAgICAgIGxhYmVsOiBsYWJlbFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjkgVGhlIHJldHVybiBzdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlUmV0dXJuU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgdG9rZW4sIGFyZ3VtZW50ID0gbnVsbDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdyZXR1cm4nKTtcblxuICAgICAgICBpZiAoIXN0YXRlLmluRnVuY3Rpb25Cb2R5KSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLklsbGVnYWxSZXR1cm4pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gJ3JldHVybicgZm9sbG93ZWQgYnkgYSBzcGFjZSBhbmQgYW4gaWRlbnRpZmllciBpcyB2ZXJ5IGNvbW1vbi5cbiAgICAgICAgaWYgKHNvdXJjZVtpbmRleF0gPT09ICcgJykge1xuICAgICAgICAgICAgaWYgKGlzSWRlbnRpZmllclN0YXJ0KHNvdXJjZVtpbmRleCArIDFdKSkge1xuICAgICAgICAgICAgICAgIGFyZ3VtZW50ID0gcGFyc2VFeHByZXNzaW9uKCk7XG4gICAgICAgICAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5SZXR1cm5TdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgIGFyZ3VtZW50OiBhcmd1bWVudFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocGVla0xpbmVUZXJtaW5hdG9yKCkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlJldHVyblN0YXRlbWVudCxcbiAgICAgICAgICAgICAgICBhcmd1bWVudDogbnVsbFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghbWF0Y2goJzsnKSkge1xuICAgICAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgICAgIGlmICghbWF0Y2goJ30nKSAmJiB0b2tlbi50eXBlICE9PSBUb2tlbi5FT0YpIHtcbiAgICAgICAgICAgICAgICBhcmd1bWVudCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguUmV0dXJuU3RhdGVtZW50LFxuICAgICAgICAgICAgYXJndW1lbnQ6IGFyZ3VtZW50XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuMTAgVGhlIHdpdGggc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZVdpdGhTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciBvYmplY3QsIGJvZHk7XG5cbiAgICAgICAgaWYgKHN0cmljdCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5TdHJpY3RNb2RlV2l0aCk7XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3RLZXl3b3JkKCd3aXRoJyk7XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgb2JqZWN0ID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgZXhwZWN0KCcpJyk7XG5cbiAgICAgICAgYm9keSA9IHBhcnNlU3RhdGVtZW50KCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5XaXRoU3RhdGVtZW50LFxuICAgICAgICAgICAgb2JqZWN0OiBvYmplY3QsXG4gICAgICAgICAgICBib2R5OiBib2R5XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuMTAgVGhlIHN3aXRoIHN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VTd2l0Y2hDYXNlKCkge1xuICAgICAgICB2YXIgdGVzdCxcbiAgICAgICAgICAgIGNvbnNlcXVlbnQgPSBbXSxcbiAgICAgICAgICAgIHN0YXRlbWVudDtcblxuICAgICAgICBpZiAobWF0Y2hLZXl3b3JkKCdkZWZhdWx0JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgdGVzdCA9IG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBleHBlY3RLZXl3b3JkKCdjYXNlJyk7XG4gICAgICAgICAgICB0ZXN0ID0gcGFyc2VFeHByZXNzaW9uKCk7XG4gICAgICAgIH1cbiAgICAgICAgZXhwZWN0KCc6Jyk7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJ30nKSB8fCBtYXRjaEtleXdvcmQoJ2RlZmF1bHQnKSB8fCBtYXRjaEtleXdvcmQoJ2Nhc2UnKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGVtZW50ID0gcGFyc2VTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc3RhdGVtZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc2VxdWVudC5wdXNoKHN0YXRlbWVudCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LlN3aXRjaENhc2UsXG4gICAgICAgICAgICB0ZXN0OiB0ZXN0LFxuICAgICAgICAgICAgY29uc2VxdWVudDogY29uc2VxdWVudFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlU3dpdGNoU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgZGlzY3JpbWluYW50LCBjYXNlcywgY2xhdXNlLCBvbGRJblN3aXRjaCwgZGVmYXVsdEZvdW5kO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ3N3aXRjaCcpO1xuXG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIGRpc2NyaW1pbmFudCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIGV4cGVjdCgneycpO1xuXG4gICAgICAgIGlmIChtYXRjaCgnfScpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlN3aXRjaFN0YXRlbWVudCxcbiAgICAgICAgICAgICAgICBkaXNjcmltaW5hbnQ6IGRpc2NyaW1pbmFudFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNhc2VzID0gW107XG5cbiAgICAgICAgb2xkSW5Td2l0Y2ggPSBzdGF0ZS5pblN3aXRjaDtcbiAgICAgICAgc3RhdGUuaW5Td2l0Y2ggPSB0cnVlO1xuICAgICAgICBkZWZhdWx0Rm91bmQgPSBmYWxzZTtcblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaCgnfScpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjbGF1c2UgPSBwYXJzZVN3aXRjaENhc2UoKTtcbiAgICAgICAgICAgIGlmIChjbGF1c2UudGVzdCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmIChkZWZhdWx0Rm91bmQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuTXVsdGlwbGVEZWZhdWx0c0luU3dpdGNoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZGVmYXVsdEZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2VzLnB1c2goY2xhdXNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXRlLmluU3dpdGNoID0gb2xkSW5Td2l0Y2g7XG5cbiAgICAgICAgZXhwZWN0KCd9Jyk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Td2l0Y2hTdGF0ZW1lbnQsXG4gICAgICAgICAgICBkaXNjcmltaW5hbnQ6IGRpc2NyaW1pbmFudCxcbiAgICAgICAgICAgIGNhc2VzOiBjYXNlc1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjEzIFRoZSB0aHJvdyBzdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlVGhyb3dTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciBhcmd1bWVudDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCd0aHJvdycpO1xuXG4gICAgICAgIGlmIChwZWVrTGluZVRlcm1pbmF0b3IoKSkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuTmV3bGluZUFmdGVyVGhyb3cpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXJndW1lbnQgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBjb25zdW1lU2VtaWNvbG9uKCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5UaHJvd1N0YXRlbWVudCxcbiAgICAgICAgICAgIGFyZ3VtZW50OiBhcmd1bWVudFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjE0IFRoZSB0cnkgc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZUNhdGNoQ2xhdXNlKCkge1xuICAgICAgICB2YXIgcGFyYW07XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnY2F0Y2gnKTtcblxuICAgICAgICBleHBlY3QoJygnKTtcbiAgICAgICAgaWYgKG1hdGNoKCcpJykpIHtcbiAgICAgICAgICAgIHRocm93VW5leHBlY3RlZChsb29rYWhlYWQoKSk7XG4gICAgICAgIH1cblxuICAgICAgICBwYXJhbSA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCk7XG4gICAgICAgIC8vIDEyLjE0LjFcbiAgICAgICAgaWYgKHN0cmljdCAmJiBpc1Jlc3RyaWN0ZWRXb3JkKHBhcmFtLm5hbWUpKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLlN0cmljdENhdGNoVmFyaWFibGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCcpJyk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5DYXRjaENsYXVzZSxcbiAgICAgICAgICAgIHBhcmFtOiBwYXJhbSxcbiAgICAgICAgICAgIGJvZHk6IHBhcnNlQmxvY2soKVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlVHJ5U3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgYmxvY2ssIGhhbmRsZXJzID0gW10sIGZpbmFsaXplciA9IG51bGw7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgndHJ5Jyk7XG5cbiAgICAgICAgYmxvY2sgPSBwYXJzZUJsb2NrKCk7XG5cbiAgICAgICAgaWYgKG1hdGNoS2V5d29yZCgnY2F0Y2gnKSkge1xuICAgICAgICAgICAgaGFuZGxlcnMucHVzaChwYXJzZUNhdGNoQ2xhdXNlKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoS2V5d29yZCgnZmluYWxseScpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIGZpbmFsaXplciA9IHBhcnNlQmxvY2soKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChoYW5kbGVycy5sZW5ndGggPT09IDAgJiYgIWZpbmFsaXplcikge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuTm9DYXRjaE9yRmluYWxseSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LlRyeVN0YXRlbWVudCxcbiAgICAgICAgICAgIGJsb2NrOiBibG9jayxcbiAgICAgICAgICAgIGd1YXJkZWRIYW5kbGVyczogW10sXG4gICAgICAgICAgICBoYW5kbGVyczogaGFuZGxlcnMsXG4gICAgICAgICAgICBmaW5hbGl6ZXI6IGZpbmFsaXplclxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjE1IFRoZSBkZWJ1Z2dlciBzdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlRGVidWdnZXJTdGF0ZW1lbnQoKSB7XG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ2RlYnVnZ2VyJyk7XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguRGVidWdnZXJTdGF0ZW1lbnRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMiBTdGF0ZW1lbnRzXG5cbiAgICBmdW5jdGlvbiBwYXJzZVN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbG9va2FoZWFkKCksXG4gICAgICAgICAgICBleHByLFxuICAgICAgICAgICAgbGFiZWxlZEJvZHk7XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLkVPRikge1xuICAgICAgICAgICAgdGhyb3dVbmV4cGVjdGVkKHRva2VuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5QdW5jdHVhdG9yKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKHRva2VuLnZhbHVlKSB7XG4gICAgICAgICAgICBjYXNlICc7JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VFbXB0eVN0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAneyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlQmxvY2soKTtcbiAgICAgICAgICAgIGNhc2UgJygnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUV4cHJlc3Npb25TdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uS2V5d29yZCkge1xuICAgICAgICAgICAgc3dpdGNoICh0b2tlbi52YWx1ZSkge1xuICAgICAgICAgICAgY2FzZSAnYnJlYWsnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUJyZWFrU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICdjb250aW51ZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlQ29udGludWVTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ2RlYnVnZ2VyJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VEZWJ1Z2dlclN0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAnZG8nOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZURvV2hpbGVTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ2Zvcic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRm9yU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbigpO1xuICAgICAgICAgICAgY2FzZSAnaWYnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUlmU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICdyZXR1cm4nOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZVJldHVyblN0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAnc3dpdGNoJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VTd2l0Y2hTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3Rocm93JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VUaHJvd1N0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAndHJ5JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VUcnlTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3Zhcic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlVmFyaWFibGVTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3doaWxlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VXaGlsZVN0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAnd2l0aCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlV2l0aFN0YXRlbWVudCgpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4cHIgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICAvLyAxMi4xMiBMYWJlbGxlZCBTdGF0ZW1lbnRzXG4gICAgICAgIGlmICgoZXhwci50eXBlID09PSBTeW50YXguSWRlbnRpZmllcikgJiYgbWF0Y2goJzonKSkge1xuICAgICAgICAgICAgbGV4KCk7XG5cbiAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc3RhdGUubGFiZWxTZXQsIGV4cHIubmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5SZWRlY2xhcmF0aW9uLCAnTGFiZWwnLCBleHByLm5hbWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzdGF0ZS5sYWJlbFNldFtleHByLm5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgIGxhYmVsZWRCb2R5ID0gcGFyc2VTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGRlbGV0ZSBzdGF0ZS5sYWJlbFNldFtleHByLm5hbWVdO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5MYWJlbGVkU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgIGxhYmVsOiBleHByLFxuICAgICAgICAgICAgICAgIGJvZHk6IGxhYmVsZWRCb2R5XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguRXhwcmVzc2lvblN0YXRlbWVudCxcbiAgICAgICAgICAgIGV4cHJlc3Npb246IGV4cHJcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMyBGdW5jdGlvbiBEZWZpbml0aW9uXG5cbiAgICBmdW5jdGlvbiBwYXJzZUZ1bmN0aW9uU291cmNlRWxlbWVudHMoKSB7XG4gICAgICAgIHZhciBzb3VyY2VFbGVtZW50LCBzb3VyY2VFbGVtZW50cyA9IFtdLCB0b2tlbiwgZGlyZWN0aXZlLCBmaXJzdFJlc3RyaWN0ZWQsXG4gICAgICAgICAgICBvbGRMYWJlbFNldCwgb2xkSW5JdGVyYXRpb24sIG9sZEluU3dpdGNoLCBvbGRJbkZ1bmN0aW9uQm9keTtcblxuICAgICAgICBleHBlY3QoJ3snKTtcblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uU3RyaW5nTGl0ZXJhbCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzb3VyY2VFbGVtZW50ID0gcGFyc2VTb3VyY2VFbGVtZW50KCk7XG4gICAgICAgICAgICBzb3VyY2VFbGVtZW50cy5wdXNoKHNvdXJjZUVsZW1lbnQpO1xuICAgICAgICAgICAgaWYgKHNvdXJjZUVsZW1lbnQuZXhwcmVzc2lvbi50eXBlICE9PSBTeW50YXguTGl0ZXJhbCkge1xuICAgICAgICAgICAgICAgIC8vIHRoaXMgaXMgbm90IGRpcmVjdGl2ZVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGlyZWN0aXZlID0gc2xpY2VTb3VyY2UodG9rZW4ucmFuZ2VbMF0gKyAxLCB0b2tlbi5yYW5nZVsxXSAtIDEpO1xuICAgICAgICAgICAgaWYgKGRpcmVjdGl2ZSA9PT0gJ3VzZSBzdHJpY3QnKSB7XG4gICAgICAgICAgICAgICAgc3RyaWN0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZiAoZmlyc3RSZXN0cmljdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudChmaXJzdFJlc3RyaWN0ZWQsIE1lc3NhZ2VzLlN0cmljdE9jdGFsTGl0ZXJhbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIWZpcnN0UmVzdHJpY3RlZCAmJiB0b2tlbi5vY3RhbCkge1xuICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBvbGRMYWJlbFNldCA9IHN0YXRlLmxhYmVsU2V0O1xuICAgICAgICBvbGRJbkl0ZXJhdGlvbiA9IHN0YXRlLmluSXRlcmF0aW9uO1xuICAgICAgICBvbGRJblN3aXRjaCA9IHN0YXRlLmluU3dpdGNoO1xuICAgICAgICBvbGRJbkZ1bmN0aW9uQm9keSA9IHN0YXRlLmluRnVuY3Rpb25Cb2R5O1xuXG4gICAgICAgIHN0YXRlLmxhYmVsU2V0ID0ge307XG4gICAgICAgIHN0YXRlLmluSXRlcmF0aW9uID0gZmFsc2U7XG4gICAgICAgIHN0YXRlLmluU3dpdGNoID0gZmFsc2U7XG4gICAgICAgIHN0YXRlLmluRnVuY3Rpb25Cb2R5ID0gdHJ1ZTtcblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaCgnfScpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzb3VyY2VFbGVtZW50ID0gcGFyc2VTb3VyY2VFbGVtZW50KCk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHNvdXJjZUVsZW1lbnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzb3VyY2VFbGVtZW50cy5wdXNoKHNvdXJjZUVsZW1lbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCd9Jyk7XG5cbiAgICAgICAgc3RhdGUubGFiZWxTZXQgPSBvbGRMYWJlbFNldDtcbiAgICAgICAgc3RhdGUuaW5JdGVyYXRpb24gPSBvbGRJbkl0ZXJhdGlvbjtcbiAgICAgICAgc3RhdGUuaW5Td2l0Y2ggPSBvbGRJblN3aXRjaDtcbiAgICAgICAgc3RhdGUuaW5GdW5jdGlvbkJvZHkgPSBvbGRJbkZ1bmN0aW9uQm9keTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkJsb2NrU3RhdGVtZW50LFxuICAgICAgICAgICAgYm9keTogc291cmNlRWxlbWVudHNcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb24oKSB7XG4gICAgICAgIHZhciBpZCwgcGFyYW0sIHBhcmFtcyA9IFtdLCBib2R5LCB0b2tlbiwgc3RyaWN0ZWQsIGZpcnN0UmVzdHJpY3RlZCwgbWVzc2FnZSwgcHJldmlvdXNTdHJpY3QsIHBhcmFtU2V0O1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ2Z1bmN0aW9uJyk7XG4gICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIGlkID0gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKTtcbiAgICAgICAgaWYgKHN0cmljdCkge1xuICAgICAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHRva2VuLCBNZXNzYWdlcy5TdHJpY3RGdW5jdGlvbk5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdEZ1bmN0aW9uTmFtZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpY3RNb2RlUmVzZXJ2ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RSZXNlcnZlZFdvcmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICBpZiAoIW1hdGNoKCcpJykpIHtcbiAgICAgICAgICAgIHBhcmFtU2V0ID0ge307XG4gICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICAgICAgICAgIHBhcmFtID0gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKTtcbiAgICAgICAgICAgICAgICBpZiAoc3RyaWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1Jlc3RyaWN0ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbU5hbWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChwYXJhbVNldCwgdG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFBhcmFtRHVwZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIWZpcnN0UmVzdHJpY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNSZXN0cmljdGVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFBhcmFtTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc1N0cmljdE1vZGVSZXNlcnZlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RSZXNlcnZlZFdvcmQ7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHBhcmFtU2V0LCB0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFBhcmFtRHVwZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYXJhbXMucHVzaChwYXJhbSk7XG4gICAgICAgICAgICAgICAgcGFyYW1TZXRbcGFyYW0ubmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBleHBlY3QoJywnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIHByZXZpb3VzU3RyaWN0ID0gc3RyaWN0O1xuICAgICAgICBib2R5ID0gcGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzKCk7XG4gICAgICAgIGlmIChzdHJpY3QgJiYgZmlyc3RSZXN0cmljdGVkKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKGZpcnN0UmVzdHJpY3RlZCwgbWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0cmljdCAmJiBzdHJpY3RlZCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHN0cmljdGVkLCBtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgICBzdHJpY3QgPSBwcmV2aW91c1N0cmljdDtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb24sXG4gICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICBwYXJhbXM6IHBhcmFtcyxcbiAgICAgICAgICAgIGRlZmF1bHRzOiBbXSxcbiAgICAgICAgICAgIGJvZHk6IGJvZHksXG4gICAgICAgICAgICByZXN0OiBudWxsLFxuICAgICAgICAgICAgZ2VuZXJhdG9yOiBmYWxzZSxcbiAgICAgICAgICAgIGV4cHJlc3Npb246IGZhbHNlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VGdW5jdGlvbkV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciB0b2tlbiwgaWQgPSBudWxsLCBzdHJpY3RlZCwgZmlyc3RSZXN0cmljdGVkLCBtZXNzYWdlLCBwYXJhbSwgcGFyYW1zID0gW10sIGJvZHksIHByZXZpb3VzU3RyaWN0LCBwYXJhbVNldDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdmdW5jdGlvbicpO1xuXG4gICAgICAgIGlmICghbWF0Y2goJygnKSkge1xuICAgICAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgICAgIGlkID0gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKTtcbiAgICAgICAgICAgIGlmIChzdHJpY3QpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNSZXN0cmljdGVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHRva2VuLCBNZXNzYWdlcy5TdHJpY3RGdW5jdGlvbk5hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0RnVuY3Rpb25OYW1lO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpY3RNb2RlUmVzZXJ2ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFJlc2VydmVkV29yZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICBpZiAoIW1hdGNoKCcpJykpIHtcbiAgICAgICAgICAgIHBhcmFtU2V0ID0ge307XG4gICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICAgICAgICAgIHBhcmFtID0gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKTtcbiAgICAgICAgICAgICAgICBpZiAoc3RyaWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1Jlc3RyaWN0ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbU5hbWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChwYXJhbVNldCwgdG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFBhcmFtRHVwZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIWZpcnN0UmVzdHJpY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNSZXN0cmljdGVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFBhcmFtTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc1N0cmljdE1vZGVSZXNlcnZlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RSZXNlcnZlZFdvcmQ7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHBhcmFtU2V0LCB0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFBhcmFtRHVwZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYXJhbXMucHVzaChwYXJhbSk7XG4gICAgICAgICAgICAgICAgcGFyYW1TZXRbcGFyYW0ubmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBleHBlY3QoJywnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIHByZXZpb3VzU3RyaWN0ID0gc3RyaWN0O1xuICAgICAgICBib2R5ID0gcGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzKCk7XG4gICAgICAgIGlmIChzdHJpY3QgJiYgZmlyc3RSZXN0cmljdGVkKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKGZpcnN0UmVzdHJpY3RlZCwgbWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0cmljdCAmJiBzdHJpY3RlZCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHN0cmljdGVkLCBtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgICBzdHJpY3QgPSBwcmV2aW91c1N0cmljdDtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkZ1bmN0aW9uRXhwcmVzc2lvbixcbiAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgIHBhcmFtczogcGFyYW1zLFxuICAgICAgICAgICAgZGVmYXVsdHM6IFtdLFxuICAgICAgICAgICAgYm9keTogYm9keSxcbiAgICAgICAgICAgIHJlc3Q6IG51bGwsXG4gICAgICAgICAgICBnZW5lcmF0b3I6IGZhbHNlLFxuICAgICAgICAgICAgZXhwcmVzc2lvbjogZmFsc2VcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxNCBQcm9ncmFtXG5cbiAgICBmdW5jdGlvbiBwYXJzZVNvdXJjZUVsZW1lbnQoKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxvb2thaGVhZCgpO1xuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5LZXl3b3JkKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKHRva2VuLnZhbHVlKSB7XG4gICAgICAgICAgICBjYXNlICdjb25zdCc6XG4gICAgICAgICAgICBjYXNlICdsZXQnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUNvbnN0TGV0RGVjbGFyYXRpb24odG9rZW4udmFsdWUpO1xuICAgICAgICAgICAgY2FzZSAnZnVuY3Rpb24nOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb24oKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlU3RhdGVtZW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uRU9GKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VTdGF0ZW1lbnQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlU291cmNlRWxlbWVudHMoKSB7XG4gICAgICAgIHZhciBzb3VyY2VFbGVtZW50LCBzb3VyY2VFbGVtZW50cyA9IFtdLCB0b2tlbiwgZGlyZWN0aXZlLCBmaXJzdFJlc3RyaWN0ZWQ7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc291cmNlRWxlbWVudCA9IHBhcnNlU291cmNlRWxlbWVudCgpO1xuICAgICAgICAgICAgc291cmNlRWxlbWVudHMucHVzaChzb3VyY2VFbGVtZW50KTtcbiAgICAgICAgICAgIGlmIChzb3VyY2VFbGVtZW50LmV4cHJlc3Npb24udHlwZSAhPT0gU3ludGF4LkxpdGVyYWwpIHtcbiAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIG5vdCBkaXJlY3RpdmVcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRpcmVjdGl2ZSA9IHNsaWNlU291cmNlKHRva2VuLnJhbmdlWzBdICsgMSwgdG9rZW4ucmFuZ2VbMV0gLSAxKTtcbiAgICAgICAgICAgIGlmIChkaXJlY3RpdmUgPT09ICd1c2Ugc3RyaWN0Jykge1xuICAgICAgICAgICAgICAgIHN0cmljdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKGZpcnN0UmVzdHJpY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoZmlyc3RSZXN0cmljdGVkLCBNZXNzYWdlcy5TdHJpY3RPY3RhbExpdGVyYWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCFmaXJzdFJlc3RyaWN0ZWQgJiYgdG9rZW4ub2N0YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBzb3VyY2VFbGVtZW50ID0gcGFyc2VTb3VyY2VFbGVtZW50KCk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHNvdXJjZUVsZW1lbnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzb3VyY2VFbGVtZW50cy5wdXNoKHNvdXJjZUVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzb3VyY2VFbGVtZW50cztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZVByb2dyYW0oKSB7XG4gICAgICAgIHZhciBwcm9ncmFtO1xuICAgICAgICBzdHJpY3QgPSBmYWxzZTtcbiAgICAgICAgcHJvZ3JhbSA9IHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Qcm9ncmFtLFxuICAgICAgICAgICAgYm9keTogcGFyc2VTb3VyY2VFbGVtZW50cygpXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBwcm9ncmFtO1xuICAgIH1cblxuICAgIC8vIFRoZSBmb2xsb3dpbmcgZnVuY3Rpb25zIGFyZSBuZWVkZWQgb25seSB3aGVuIHRoZSBvcHRpb24gdG8gcHJlc2VydmVcbiAgICAvLyB0aGUgY29tbWVudHMgaXMgYWN0aXZlLlxuXG4gICAgZnVuY3Rpb24gYWRkQ29tbWVudCh0eXBlLCB2YWx1ZSwgc3RhcnQsIGVuZCwgbG9jKSB7XG4gICAgICAgIGFzc2VydCh0eXBlb2Ygc3RhcnQgPT09ICdudW1iZXInLCAnQ29tbWVudCBtdXN0IGhhdmUgdmFsaWQgcG9zaXRpb24nKTtcblxuICAgICAgICAvLyBCZWNhdXNlIHRoZSB3YXkgdGhlIGFjdHVhbCB0b2tlbiBpcyBzY2FubmVkLCBvZnRlbiB0aGUgY29tbWVudHNcbiAgICAgICAgLy8gKGlmIGFueSkgYXJlIHNraXBwZWQgdHdpY2UgZHVyaW5nIHRoZSBsZXhpY2FsIGFuYWx5c2lzLlxuICAgICAgICAvLyBUaHVzLCB3ZSBuZWVkIHRvIHNraXAgYWRkaW5nIGEgY29tbWVudCBpZiB0aGUgY29tbWVudCBhcnJheSBhbHJlYWR5XG4gICAgICAgIC8vIGhhbmRsZWQgaXQuXG4gICAgICAgIGlmIChleHRyYS5jb21tZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAoZXh0cmEuY29tbWVudHNbZXh0cmEuY29tbWVudHMubGVuZ3RoIC0gMV0ucmFuZ2VbMV0gPiBzdGFydCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4dHJhLmNvbW1lbnRzLnB1c2goe1xuICAgICAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGVuZF0sXG4gICAgICAgICAgICBsb2M6IGxvY1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzY2FuQ29tbWVudCgpIHtcbiAgICAgICAgdmFyIGNvbW1lbnQsIGNoLCBsb2MsIHN0YXJ0LCBibG9ja0NvbW1lbnQsIGxpbmVDb21tZW50O1xuXG4gICAgICAgIGNvbW1lbnQgPSAnJztcbiAgICAgICAgYmxvY2tDb21tZW50ID0gZmFsc2U7XG4gICAgICAgIGxpbmVDb21tZW50ID0gZmFsc2U7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG5cbiAgICAgICAgICAgIGlmIChsaW5lQ29tbWVudCkge1xuICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgIGlmIChpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgICAgICBsb2MuZW5kID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnQgLSAxXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIGxpbmVDb21tZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGFkZENvbW1lbnQoJ0xpbmUnLCBjb21tZW50LCBzdGFydCwgaW5kZXggLSAxLCBsb2MpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICdcXHInICYmIHNvdXJjZVtpbmRleF0gPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICsrbGluZU51bWJlcjtcbiAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0ID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgPSAnJztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBsaW5lQ29tbWVudCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBjb21tZW50ICs9IGNoO1xuICAgICAgICAgICAgICAgICAgICBsb2MuZW5kID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogbGVuZ3RoIC0gbGluZVN0YXJ0XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIGFkZENvbW1lbnQoJ0xpbmUnLCBjb21tZW50LCBzdGFydCwgbGVuZ3RoLCBsb2MpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgKz0gY2g7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChibG9ja0NvbW1lbnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAnXFxyJyAmJiBzb3VyY2VbaW5kZXggKyAxXSA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb21tZW50ICs9ICdcXHJcXG4nO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tbWVudCArPSBjaDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICArK2xpbmVOdW1iZXI7XG4gICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVTdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgKz0gY2g7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJyonKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICcvJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgPSBjb21tZW50LnN1YnN0cigwLCBjb21tZW50Lmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrQ29tbWVudCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jLmVuZCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkQ29tbWVudCgnQmxvY2snLCBjb21tZW50LCBzdGFydCwgaW5kZXgsIGxvYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tbWVudCA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXggKyAxXTtcbiAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICcvJykge1xuICAgICAgICAgICAgICAgICAgICBsb2MgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBzdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICBpbmRleCArPSAyO1xuICAgICAgICAgICAgICAgICAgICBsaW5lQ29tbWVudCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvYy5lbmQgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgbGluZUNvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZENvbW1lbnQoJ0xpbmUnLCBjb21tZW50LCBzdGFydCwgaW5kZXgsIGxvYyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnKicpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggKz0gMjtcbiAgICAgICAgICAgICAgICAgICAgYmxvY2tDb21tZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgbG9jID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnQgLSAyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNXaGl0ZVNwYWNlKGNoKSkge1xuICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICAnXFxyJyAmJiBzb3VyY2VbaW5kZXhdID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICArK2xpbmVOdW1iZXI7XG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0ID0gaW5kZXg7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZmlsdGVyQ29tbWVudExvY2F0aW9uKCkge1xuICAgICAgICB2YXIgaSwgZW50cnksIGNvbW1lbnQsIGNvbW1lbnRzID0gW107XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGV4dHJhLmNvbW1lbnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBlbnRyeSA9IGV4dHJhLmNvbW1lbnRzW2ldO1xuICAgICAgICAgICAgY29tbWVudCA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBlbnRyeS50eXBlLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBlbnRyeS52YWx1ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmIChleHRyYS5yYW5nZSkge1xuICAgICAgICAgICAgICAgIGNvbW1lbnQucmFuZ2UgPSBlbnRyeS5yYW5nZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChleHRyYS5sb2MpIHtcbiAgICAgICAgICAgICAgICBjb21tZW50LmxvYyA9IGVudHJ5LmxvYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbW1lbnRzLnB1c2goY29tbWVudCk7XG4gICAgICAgIH1cblxuICAgICAgICBleHRyYS5jb21tZW50cyA9IGNvbW1lbnRzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbGxlY3RUb2tlbigpIHtcbiAgICAgICAgdmFyIHN0YXJ0LCBsb2MsIHRva2VuLCByYW5nZSwgdmFsdWU7XG5cbiAgICAgICAgc2tpcENvbW1lbnQoKTtcbiAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgICAgbG9jID0ge1xuICAgICAgICAgICAgc3RhcnQ6IHtcbiAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB0b2tlbiA9IGV4dHJhLmFkdmFuY2UoKTtcbiAgICAgICAgbG9jLmVuZCA9IHtcbiAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLkVPRikge1xuICAgICAgICAgICAgcmFuZ2UgPSBbdG9rZW4ucmFuZ2VbMF0sIHRva2VuLnJhbmdlWzFdXTtcbiAgICAgICAgICAgIHZhbHVlID0gc2xpY2VTb3VyY2UodG9rZW4ucmFuZ2VbMF0sIHRva2VuLnJhbmdlWzFdKTtcbiAgICAgICAgICAgIGV4dHJhLnRva2Vucy5wdXNoKHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbk5hbWVbdG9rZW4udHlwZV0sXG4gICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgICAgIHJhbmdlOiByYW5nZSxcbiAgICAgICAgICAgICAgICBsb2M6IGxvY1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29sbGVjdFJlZ2V4KCkge1xuICAgICAgICB2YXIgcG9zLCBsb2MsIHJlZ2V4LCB0b2tlbjtcblxuICAgICAgICBza2lwQ29tbWVudCgpO1xuXG4gICAgICAgIHBvcyA9IGluZGV4O1xuICAgICAgICBsb2MgPSB7XG4gICAgICAgICAgICBzdGFydDoge1xuICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHJlZ2V4ID0gZXh0cmEuc2NhblJlZ0V4cCgpO1xuICAgICAgICBsb2MuZW5kID0ge1xuICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBQb3AgdGhlIHByZXZpb3VzIHRva2VuLCB3aGljaCBpcyBsaWtlbHkgJy8nIG9yICcvPSdcbiAgICAgICAgaWYgKGV4dHJhLnRva2Vucy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB0b2tlbiA9IGV4dHJhLnRva2Vuc1tleHRyYS50b2tlbnMubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICBpZiAodG9rZW4ucmFuZ2VbMF0gPT09IHBvcyAmJiB0b2tlbi50eXBlID09PSAnUHVuY3R1YXRvcicpIHtcbiAgICAgICAgICAgICAgICBpZiAodG9rZW4udmFsdWUgPT09ICcvJyB8fCB0b2tlbi52YWx1ZSA9PT0gJy89Jykge1xuICAgICAgICAgICAgICAgICAgICBleHRyYS50b2tlbnMucG9wKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXh0cmEudG9rZW5zLnB1c2goe1xuICAgICAgICAgICAgdHlwZTogJ1JlZ3VsYXJFeHByZXNzaW9uJyxcbiAgICAgICAgICAgIHZhbHVlOiByZWdleC5saXRlcmFsLFxuICAgICAgICAgICAgcmFuZ2U6IFtwb3MsIGluZGV4XSxcbiAgICAgICAgICAgIGxvYzogbG9jXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiByZWdleDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmaWx0ZXJUb2tlbkxvY2F0aW9uKCkge1xuICAgICAgICB2YXIgaSwgZW50cnksIHRva2VuLCB0b2tlbnMgPSBbXTtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZXh0cmEudG9rZW5zLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBlbnRyeSA9IGV4dHJhLnRva2Vuc1tpXTtcbiAgICAgICAgICAgIHRva2VuID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IGVudHJ5LnR5cGUsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGVudHJ5LnZhbHVlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKGV4dHJhLnJhbmdlKSB7XG4gICAgICAgICAgICAgICAgdG9rZW4ucmFuZ2UgPSBlbnRyeS5yYW5nZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChleHRyYS5sb2MpIHtcbiAgICAgICAgICAgICAgICB0b2tlbi5sb2MgPSBlbnRyeS5sb2M7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0b2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICBleHRyYS50b2tlbnMgPSB0b2tlbnM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlTGl0ZXJhbCh0b2tlbikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkxpdGVyYWwsXG4gICAgICAgICAgICB2YWx1ZTogdG9rZW4udmFsdWVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVSYXdMaXRlcmFsKHRva2VuKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguTGl0ZXJhbCxcbiAgICAgICAgICAgIHZhbHVlOiB0b2tlbi52YWx1ZSxcbiAgICAgICAgICAgIHJhdzogc2xpY2VTb3VyY2UodG9rZW4ucmFuZ2VbMF0sIHRva2VuLnJhbmdlWzFdKVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUxvY2F0aW9uTWFya2VyKCkge1xuICAgICAgICB2YXIgbWFya2VyID0ge307XG5cbiAgICAgICAgbWFya2VyLnJhbmdlID0gW2luZGV4LCBpbmRleF07XG4gICAgICAgIG1hcmtlci5sb2MgPSB7XG4gICAgICAgICAgICBzdGFydDoge1xuICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVuZDoge1xuICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIG1hcmtlci5lbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnJhbmdlWzFdID0gaW5kZXg7XG4gICAgICAgICAgICB0aGlzLmxvYy5lbmQubGluZSA9IGxpbmVOdW1iZXI7XG4gICAgICAgICAgICB0aGlzLmxvYy5lbmQuY29sdW1uID0gaW5kZXggLSBsaW5lU3RhcnQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgbWFya2VyLmFwcGx5R3JvdXAgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgaWYgKGV4dHJhLnJhbmdlKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5ncm91cFJhbmdlID0gW3RoaXMucmFuZ2VbMF0sIHRoaXMucmFuZ2VbMV1dO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGV4dHJhLmxvYykge1xuICAgICAgICAgICAgICAgIG5vZGUuZ3JvdXBMb2MgPSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiB0aGlzLmxvYy5zdGFydC5saW5lLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiB0aGlzLmxvYy5zdGFydC5jb2x1bW5cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZW5kOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiB0aGlzLmxvYy5lbmQubGluZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogdGhpcy5sb2MuZW5kLmNvbHVtblxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBtYXJrZXIuYXBwbHkgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgaWYgKGV4dHJhLnJhbmdlKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5yYW5nZSA9IFt0aGlzLnJhbmdlWzBdLCB0aGlzLnJhbmdlWzFdXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChleHRyYS5sb2MpIHtcbiAgICAgICAgICAgICAgICBub2RlLmxvYyA9IHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IHRoaXMubG9jLnN0YXJ0LmxpbmUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IHRoaXMubG9jLnN0YXJ0LmNvbHVtblxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBlbmQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IHRoaXMubG9jLmVuZC5saW5lLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiB0aGlzLmxvYy5lbmQuY29sdW1uXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBtYXJrZXI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHJhY2tHcm91cEV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBtYXJrZXIsIGV4cHI7XG5cbiAgICAgICAgc2tpcENvbW1lbnQoKTtcbiAgICAgICAgbWFya2VyID0gY3JlYXRlTG9jYXRpb25NYXJrZXIoKTtcbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgZXhwciA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIG1hcmtlci5lbmQoKTtcbiAgICAgICAgbWFya2VyLmFwcGx5R3JvdXAoZXhwcik7XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHJhY2tMZWZ0SGFuZFNpZGVFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgbWFya2VyLCBleHByO1xuXG4gICAgICAgIHNraXBDb21tZW50KCk7XG4gICAgICAgIG1hcmtlciA9IGNyZWF0ZUxvY2F0aW9uTWFya2VyKCk7XG5cbiAgICAgICAgZXhwciA9IG1hdGNoS2V5d29yZCgnbmV3JykgPyBwYXJzZU5ld0V4cHJlc3Npb24oKSA6IHBhcnNlUHJpbWFyeUV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJy4nKSB8fCBtYXRjaCgnWycpKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJ1snKSkge1xuICAgICAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjb21wdXRlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiBleHByLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogcGFyc2VDb21wdXRlZE1lbWJlcigpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuZW5kKCk7XG4gICAgICAgICAgICAgICAgbWFya2VyLmFwcGx5KGV4cHIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgY29tcHV0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwYXJzZU5vbkNvbXB1dGVkTWVtYmVyKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIG1hcmtlci5lbmQoKTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuYXBwbHkoZXhwcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0cmFja0xlZnRIYW5kU2lkZUV4cHJlc3Npb25BbGxvd0NhbGwoKSB7XG4gICAgICAgIHZhciBtYXJrZXIsIGV4cHI7XG5cbiAgICAgICAgc2tpcENvbW1lbnQoKTtcbiAgICAgICAgbWFya2VyID0gY3JlYXRlTG9jYXRpb25NYXJrZXIoKTtcblxuICAgICAgICBleHByID0gbWF0Y2hLZXl3b3JkKCduZXcnKSA/IHBhcnNlTmV3RXhwcmVzc2lvbigpIDogcGFyc2VQcmltYXJ5RXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnLicpIHx8IG1hdGNoKCdbJykgfHwgbWF0Y2goJygnKSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoKCcoJykpIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQ2FsbEV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNhbGxlZTogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgJ2FyZ3VtZW50cyc6IHBhcnNlQXJndW1lbnRzKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIG1hcmtlci5lbmQoKTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuYXBwbHkoZXhwcik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1hdGNoKCdbJykpIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgY29tcHV0ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdDogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHBhcnNlQ29tcHV0ZWRNZW1iZXIoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgbWFya2VyLmVuZCgpO1xuICAgICAgICAgICAgICAgIG1hcmtlci5hcHBseShleHByKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNvbXB1dGVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiBleHByLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogcGFyc2VOb25Db21wdXRlZE1lbWJlcigpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuZW5kKCk7XG4gICAgICAgICAgICAgICAgbWFya2VyLmFwcGx5KGV4cHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZmlsdGVyR3JvdXAobm9kZSkge1xuICAgICAgICB2YXIgbiwgaSwgZW50cnk7XG5cbiAgICAgICAgbiA9IChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmFwcGx5KG5vZGUpID09PSAnW29iamVjdCBBcnJheV0nKSA/IFtdIDoge307XG4gICAgICAgIGZvciAoaSBpbiBub2RlKSB7XG4gICAgICAgICAgICBpZiAobm9kZS5oYXNPd25Qcm9wZXJ0eShpKSAmJiBpICE9PSAnZ3JvdXBSYW5nZScgJiYgaSAhPT0gJ2dyb3VwTG9jJykge1xuICAgICAgICAgICAgICAgIGVudHJ5ID0gbm9kZVtpXTtcbiAgICAgICAgICAgICAgICBpZiAoZW50cnkgPT09IG51bGwgfHwgdHlwZW9mIGVudHJ5ICE9PSAnb2JqZWN0JyB8fCBlbnRyeSBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICAgICAgICAgICAgICBuW2ldID0gZW50cnk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbltpXSA9IGZpbHRlckdyb3VwKGVudHJ5KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG47XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gd3JhcFRyYWNraW5nRnVuY3Rpb24ocmFuZ2UsIGxvYykge1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAocGFyc2VGdW5jdGlvbikge1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBpc0JpbmFyeShub2RlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGUudHlwZSA9PT0gU3ludGF4LkxvZ2ljYWxFeHByZXNzaW9uIHx8XG4gICAgICAgICAgICAgICAgICAgIG5vZGUudHlwZSA9PT0gU3ludGF4LkJpbmFyeUV4cHJlc3Npb247XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHZpc2l0KG5vZGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgc3RhcnQsIGVuZDtcblxuICAgICAgICAgICAgICAgIGlmIChpc0JpbmFyeShub2RlLmxlZnQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2l0KG5vZGUubGVmdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChpc0JpbmFyeShub2RlLnJpZ2h0KSkge1xuICAgICAgICAgICAgICAgICAgICB2aXNpdChub2RlLnJpZ2h0KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUubGVmdC5ncm91cFJhbmdlIHx8IG5vZGUucmlnaHQuZ3JvdXBSYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBub2RlLmxlZnQuZ3JvdXBSYW5nZSA/IG5vZGUubGVmdC5ncm91cFJhbmdlWzBdIDogbm9kZS5sZWZ0LnJhbmdlWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgZW5kID0gbm9kZS5yaWdodC5ncm91cFJhbmdlID8gbm9kZS5yaWdodC5ncm91cFJhbmdlWzFdIDogbm9kZS5yaWdodC5yYW5nZVsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUucmFuZ2UgPSBbc3RhcnQsIGVuZF07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG5vZGUucmFuZ2UgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydCA9IG5vZGUubGVmdC5yYW5nZVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuZCA9IG5vZGUucmlnaHQucmFuZ2VbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLnJhbmdlID0gW3N0YXJ0LCBlbmRdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChsb2MpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUubGVmdC5ncm91cExvYyB8fCBub2RlLnJpZ2h0Lmdyb3VwTG9jKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydCA9IG5vZGUubGVmdC5ncm91cExvYyA/IG5vZGUubGVmdC5ncm91cExvYy5zdGFydCA6IG5vZGUubGVmdC5sb2Muc3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbmQgPSBub2RlLnJpZ2h0Lmdyb3VwTG9jID8gbm9kZS5yaWdodC5ncm91cExvYy5lbmQgOiBub2RlLnJpZ2h0LmxvYy5lbmQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLmxvYyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydDogc3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kOiBlbmRcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG5vZGUubG9jID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5sb2MgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IG5vZGUubGVmdC5sb2Muc3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kOiBub2RlLnJpZ2h0LmxvYy5lbmRcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1hcmtlciwgbm9kZTtcblxuICAgICAgICAgICAgICAgIHNraXBDb21tZW50KCk7XG5cbiAgICAgICAgICAgICAgICBtYXJrZXIgPSBjcmVhdGVMb2NhdGlvbk1hcmtlcigpO1xuICAgICAgICAgICAgICAgIG5vZGUgPSBwYXJzZUZ1bmN0aW9uLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgbWFya2VyLmVuZCgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJhbmdlICYmIHR5cGVvZiBub2RlLnJhbmdlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBtYXJrZXIuYXBwbHkobm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGxvYyAmJiB0eXBlb2Ygbm9kZS5sb2MgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIG1hcmtlci5hcHBseShub2RlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNCaW5hcnkobm9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmlzaXQobm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhdGNoKCkge1xuXG4gICAgICAgIHZhciB3cmFwVHJhY2tpbmc7XG5cbiAgICAgICAgaWYgKGV4dHJhLmNvbW1lbnRzKSB7XG4gICAgICAgICAgICBleHRyYS5za2lwQ29tbWVudCA9IHNraXBDb21tZW50O1xuICAgICAgICAgICAgc2tpcENvbW1lbnQgPSBzY2FuQ29tbWVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChleHRyYS5yYXcpIHtcbiAgICAgICAgICAgIGV4dHJhLmNyZWF0ZUxpdGVyYWwgPSBjcmVhdGVMaXRlcmFsO1xuICAgICAgICAgICAgY3JlYXRlTGl0ZXJhbCA9IGNyZWF0ZVJhd0xpdGVyYWw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZXh0cmEucmFuZ2UgfHwgZXh0cmEubG9jKSB7XG5cbiAgICAgICAgICAgIGV4dHJhLnBhcnNlR3JvdXBFeHByZXNzaW9uID0gcGFyc2VHcm91cEV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb24gPSBwYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb25BbGxvd0NhbGwgPSBwYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb25BbGxvd0NhbGw7XG4gICAgICAgICAgICBwYXJzZUdyb3VwRXhwcmVzc2lvbiA9IHRyYWNrR3JvdXBFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uID0gdHJhY2tMZWZ0SGFuZFNpZGVFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsID0gdHJhY2tMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsO1xuXG4gICAgICAgICAgICB3cmFwVHJhY2tpbmcgPSB3cmFwVHJhY2tpbmdGdW5jdGlvbihleHRyYS5yYW5nZSwgZXh0cmEubG9jKTtcblxuICAgICAgICAgICAgZXh0cmEucGFyc2VBZGRpdGl2ZUV4cHJlc3Npb24gPSBwYXJzZUFkZGl0aXZlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24gPSBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VCaXR3aXNlQU5ERXhwcmVzc2lvbiA9IHBhcnNlQml0d2lzZUFOREV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUJpdHdpc2VPUkV4cHJlc3Npb24gPSBwYXJzZUJpdHdpc2VPUkV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUJpdHdpc2VYT1JFeHByZXNzaW9uID0gcGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlQmxvY2sgPSBwYXJzZUJsb2NrO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzID0gcGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VDYXRjaENsYXVzZSA9IHBhcnNlQ2F0Y2hDbGF1c2U7XG4gICAgICAgICAgICBleHRyYS5wYXJzZUNvbXB1dGVkTWVtYmVyID0gcGFyc2VDb21wdXRlZE1lbWJlcjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlQ29uZGl0aW9uYWxFeHByZXNzaW9uID0gcGFyc2VDb25kaXRpb25hbEV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUNvbnN0TGV0RGVjbGFyYXRpb24gPSBwYXJzZUNvbnN0TGV0RGVjbGFyYXRpb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUVxdWFsaXR5RXhwcmVzc2lvbiA9IHBhcnNlRXF1YWxpdHlFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VFeHByZXNzaW9uID0gcGFyc2VFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VGb3JWYXJpYWJsZURlY2xhcmF0aW9uID0gcGFyc2VGb3JWYXJpYWJsZURlY2xhcmF0aW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VGdW5jdGlvbkRlY2xhcmF0aW9uID0gcGFyc2VGdW5jdGlvbkRlY2xhcmF0aW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VGdW5jdGlvbkV4cHJlc3Npb24gPSBwYXJzZUZ1bmN0aW9uRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlTG9naWNhbEFOREV4cHJlc3Npb24gPSBwYXJzZUxvZ2ljYWxBTkRFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VMb2dpY2FsT1JFeHByZXNzaW9uID0gcGFyc2VMb2dpY2FsT1JFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VNdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb24gPSBwYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlTmV3RXhwcmVzc2lvbiA9IHBhcnNlTmV3RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eSA9IHBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eTtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlT2JqZWN0UHJvcGVydHkgPSBwYXJzZU9iamVjdFByb3BlcnR5O1xuICAgICAgICAgICAgZXh0cmEucGFyc2VPYmplY3RQcm9wZXJ0eUtleSA9IHBhcnNlT2JqZWN0UHJvcGVydHlLZXk7XG4gICAgICAgICAgICBleHRyYS5wYXJzZVBvc3RmaXhFeHByZXNzaW9uID0gcGFyc2VQb3N0Zml4RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlUHJpbWFyeUV4cHJlc3Npb24gPSBwYXJzZVByaW1hcnlFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VQcm9ncmFtID0gcGFyc2VQcm9ncmFtO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VQcm9wZXJ0eUZ1bmN0aW9uID0gcGFyc2VQcm9wZXJ0eUZ1bmN0aW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VSZWxhdGlvbmFsRXhwcmVzc2lvbiA9IHBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZVN0YXRlbWVudCA9IHBhcnNlU3RhdGVtZW50O1xuICAgICAgICAgICAgZXh0cmEucGFyc2VTaGlmdEV4cHJlc3Npb24gPSBwYXJzZVNoaWZ0RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlU3dpdGNoQ2FzZSA9IHBhcnNlU3dpdGNoQ2FzZTtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlVW5hcnlFeHByZXNzaW9uID0gcGFyc2VVbmFyeUV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZVZhcmlhYmxlRGVjbGFyYXRpb24gPSBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZVZhcmlhYmxlSWRlbnRpZmllciA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyO1xuXG4gICAgICAgICAgICBwYXJzZUFkZGl0aXZlRXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUFkZGl0aXZlRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VCaXR3aXNlQU5ERXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUJpdHdpc2VBTkRFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlQml0d2lzZU9SRXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUJpdHdpc2VPUkV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUJpdHdpc2VYT1JFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlQmxvY2sgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VCbG9jayk7XG4gICAgICAgICAgICBwYXJzZUZ1bmN0aW9uU291cmNlRWxlbWVudHMgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzKTtcbiAgICAgICAgICAgIHBhcnNlQ2F0Y2hDbGF1c2UgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VDYXRjaENsYXVzZSk7XG4gICAgICAgICAgICBwYXJzZUNvbXB1dGVkTWVtYmVyID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlQ29tcHV0ZWRNZW1iZXIpO1xuICAgICAgICAgICAgcGFyc2VDb25kaXRpb25hbEV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VDb25kaXRpb25hbEV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VDb25zdExldERlY2xhcmF0aW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlQ29uc3RMZXREZWNsYXJhdGlvbik7XG4gICAgICAgICAgICBwYXJzZUVxdWFsaXR5RXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUVxdWFsaXR5RXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlRm9yVmFyaWFibGVEZWNsYXJhdGlvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUZvclZhcmlhYmxlRGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgcGFyc2VGdW5jdGlvbkRlY2xhcmF0aW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbik7XG4gICAgICAgICAgICBwYXJzZUZ1bmN0aW9uRXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUZ1bmN0aW9uRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcocGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlTG9naWNhbEFOREV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VMb2dpY2FsQU5ERXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUxvZ2ljYWxPUkV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VMb2dpY2FsT1JFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlTXVsdGlwbGljYXRpdmVFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlTXVsdGlwbGljYXRpdmVFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlTmV3RXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZU5ld0V4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VOb25Db21wdXRlZFByb3BlcnR5ID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eSk7XG4gICAgICAgICAgICBwYXJzZU9iamVjdFByb3BlcnR5ID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlT2JqZWN0UHJvcGVydHkpO1xuICAgICAgICAgICAgcGFyc2VPYmplY3RQcm9wZXJ0eUtleSA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZU9iamVjdFByb3BlcnR5S2V5KTtcbiAgICAgICAgICAgIHBhcnNlUG9zdGZpeEV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VQb3N0Zml4RXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZVByaW1hcnlFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlUHJpbWFyeUV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VQcm9ncmFtID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlUHJvZ3JhbSk7XG4gICAgICAgICAgICBwYXJzZVByb3BlcnR5RnVuY3Rpb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VQcm9wZXJ0eUZ1bmN0aW9uKTtcbiAgICAgICAgICAgIHBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VSZWxhdGlvbmFsRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZVN0YXRlbWVudCA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVN0YXRlbWVudCk7XG4gICAgICAgICAgICBwYXJzZVNoaWZ0RXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVNoaWZ0RXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZVN3aXRjaENhc2UgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VTd2l0Y2hDYXNlKTtcbiAgICAgICAgICAgIHBhcnNlVW5hcnlFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlVW5hcnlFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVZhcmlhYmxlRGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VWYXJpYWJsZUlkZW50aWZpZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBleHRyYS50b2tlbnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBleHRyYS5hZHZhbmNlID0gYWR2YW5jZTtcbiAgICAgICAgICAgIGV4dHJhLnNjYW5SZWdFeHAgPSBzY2FuUmVnRXhwO1xuXG4gICAgICAgICAgICBhZHZhbmNlID0gY29sbGVjdFRva2VuO1xuICAgICAgICAgICAgc2NhblJlZ0V4cCA9IGNvbGxlY3RSZWdleDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVucGF0Y2goKSB7XG4gICAgICAgIGlmICh0eXBlb2YgZXh0cmEuc2tpcENvbW1lbnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHNraXBDb21tZW50ID0gZXh0cmEuc2tpcENvbW1lbnQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZXh0cmEucmF3KSB7XG4gICAgICAgICAgICBjcmVhdGVMaXRlcmFsID0gZXh0cmEuY3JlYXRlTGl0ZXJhbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChleHRyYS5yYW5nZSB8fCBleHRyYS5sb2MpIHtcbiAgICAgICAgICAgIHBhcnNlQWRkaXRpdmVFeHByZXNzaW9uID0gZXh0cmEucGFyc2VBZGRpdGl2ZUV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uID0gZXh0cmEucGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlQml0d2lzZUFOREV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUJpdHdpc2VBTkRFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uID0gZXh0cmEucGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlQml0d2lzZVhPUkV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUJsb2NrID0gZXh0cmEucGFyc2VCbG9jaztcbiAgICAgICAgICAgIHBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cyA9IGV4dHJhLnBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cztcbiAgICAgICAgICAgIHBhcnNlQ2F0Y2hDbGF1c2UgPSBleHRyYS5wYXJzZUNhdGNoQ2xhdXNlO1xuICAgICAgICAgICAgcGFyc2VDb21wdXRlZE1lbWJlciA9IGV4dHJhLnBhcnNlQ29tcHV0ZWRNZW1iZXI7XG4gICAgICAgICAgICBwYXJzZUNvbmRpdGlvbmFsRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlQ29uZGl0aW9uYWxFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VDb25zdExldERlY2xhcmF0aW9uID0gZXh0cmEucGFyc2VDb25zdExldERlY2xhcmF0aW9uO1xuICAgICAgICAgICAgcGFyc2VFcXVhbGl0eUV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUVxdWFsaXR5RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlRm9yVmFyaWFibGVEZWNsYXJhdGlvbiA9IGV4dHJhLnBhcnNlRm9yVmFyaWFibGVEZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIHBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbiA9IGV4dHJhLnBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIHBhcnNlRnVuY3Rpb25FeHByZXNzaW9uID0gZXh0cmEucGFyc2VGdW5jdGlvbkV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUdyb3VwRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlR3JvdXBFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uID0gZXh0cmEucGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsID0gZXh0cmEucGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsO1xuICAgICAgICAgICAgcGFyc2VMb2dpY2FsQU5ERXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlTG9naWNhbEFOREV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUxvZ2ljYWxPUkV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUxvZ2ljYWxPUkV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlTXVsdGlwbGljYXRpdmVFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VOZXdFeHByZXNzaW9uID0gZXh0cmEucGFyc2VOZXdFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VOb25Db21wdXRlZFByb3BlcnR5ID0gZXh0cmEucGFyc2VOb25Db21wdXRlZFByb3BlcnR5O1xuICAgICAgICAgICAgcGFyc2VPYmplY3RQcm9wZXJ0eSA9IGV4dHJhLnBhcnNlT2JqZWN0UHJvcGVydHk7XG4gICAgICAgICAgICBwYXJzZU9iamVjdFByb3BlcnR5S2V5ID0gZXh0cmEucGFyc2VPYmplY3RQcm9wZXJ0eUtleTtcbiAgICAgICAgICAgIHBhcnNlUHJpbWFyeUV4cHJlc3Npb24gPSBleHRyYS5wYXJzZVByaW1hcnlFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VQb3N0Zml4RXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlUG9zdGZpeEV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZVByb2dyYW0gPSBleHRyYS5wYXJzZVByb2dyYW07XG4gICAgICAgICAgICBwYXJzZVByb3BlcnR5RnVuY3Rpb24gPSBleHRyYS5wYXJzZVByb3BlcnR5RnVuY3Rpb247XG4gICAgICAgICAgICBwYXJzZVJlbGF0aW9uYWxFeHByZXNzaW9uID0gZXh0cmEucGFyc2VSZWxhdGlvbmFsRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlU3RhdGVtZW50ID0gZXh0cmEucGFyc2VTdGF0ZW1lbnQ7XG4gICAgICAgICAgICBwYXJzZVNoaWZ0RXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlU2hpZnRFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VTd2l0Y2hDYXNlID0gZXh0cmEucGFyc2VTd2l0Y2hDYXNlO1xuICAgICAgICAgICAgcGFyc2VVbmFyeUV4cHJlc3Npb24gPSBleHRyYS5wYXJzZVVuYXJ5RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbiA9IGV4dHJhLnBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIHBhcnNlVmFyaWFibGVJZGVudGlmaWVyID0gZXh0cmEucGFyc2VWYXJpYWJsZUlkZW50aWZpZXI7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGV4dHJhLnNjYW5SZWdFeHAgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGFkdmFuY2UgPSBleHRyYS5hZHZhbmNlO1xuICAgICAgICAgICAgc2NhblJlZ0V4cCA9IGV4dHJhLnNjYW5SZWdFeHA7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzdHJpbmdUb0FycmF5KHN0cikge1xuICAgICAgICB2YXIgbGVuZ3RoID0gc3RyLmxlbmd0aCxcbiAgICAgICAgICAgIHJlc3VsdCA9IFtdLFxuICAgICAgICAgICAgaTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICByZXN1bHRbaV0gPSBzdHIuY2hhckF0KGkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2UoY29kZSwgb3B0aW9ucykge1xuICAgICAgICB2YXIgcHJvZ3JhbSwgdG9TdHJpbmc7XG5cbiAgICAgICAgdG9TdHJpbmcgPSBTdHJpbmc7XG4gICAgICAgIGlmICh0eXBlb2YgY29kZSAhPT0gJ3N0cmluZycgJiYgIShjb2RlIGluc3RhbmNlb2YgU3RyaW5nKSkge1xuICAgICAgICAgICAgY29kZSA9IHRvU3RyaW5nKGNvZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgc291cmNlID0gY29kZTtcbiAgICAgICAgaW5kZXggPSAwO1xuICAgICAgICBsaW5lTnVtYmVyID0gKHNvdXJjZS5sZW5ndGggPiAwKSA/IDEgOiAwO1xuICAgICAgICBsaW5lU3RhcnQgPSAwO1xuICAgICAgICBsZW5ndGggPSBzb3VyY2UubGVuZ3RoO1xuICAgICAgICBidWZmZXIgPSBudWxsO1xuICAgICAgICBzdGF0ZSA9IHtcbiAgICAgICAgICAgIGFsbG93SW46IHRydWUsXG4gICAgICAgICAgICBsYWJlbFNldDoge30sXG4gICAgICAgICAgICBpbkZ1bmN0aW9uQm9keTogZmFsc2UsXG4gICAgICAgICAgICBpbkl0ZXJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBpblN3aXRjaDogZmFsc2VcbiAgICAgICAgfTtcblxuICAgICAgICBleHRyYSA9IHt9O1xuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBleHRyYS5yYW5nZSA9ICh0eXBlb2Ygb3B0aW9ucy5yYW5nZSA9PT0gJ2Jvb2xlYW4nKSAmJiBvcHRpb25zLnJhbmdlO1xuICAgICAgICAgICAgZXh0cmEubG9jID0gKHR5cGVvZiBvcHRpb25zLmxvYyA9PT0gJ2Jvb2xlYW4nKSAmJiBvcHRpb25zLmxvYztcbiAgICAgICAgICAgIGV4dHJhLnJhdyA9ICh0eXBlb2Ygb3B0aW9ucy5yYXcgPT09ICdib29sZWFuJykgJiYgb3B0aW9ucy5yYXc7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMudG9rZW5zID09PSAnYm9vbGVhbicgJiYgb3B0aW9ucy50b2tlbnMpIHtcbiAgICAgICAgICAgICAgICBleHRyYS50b2tlbnMgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5jb21tZW50ID09PSAnYm9vbGVhbicgJiYgb3B0aW9ucy5jb21tZW50KSB7XG4gICAgICAgICAgICAgICAgZXh0cmEuY29tbWVudHMgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy50b2xlcmFudCA9PT0gJ2Jvb2xlYW4nICYmIG9wdGlvbnMudG9sZXJhbnQpIHtcbiAgICAgICAgICAgICAgICBleHRyYS5lcnJvcnMgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChsZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHNvdXJjZVswXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAvLyBUcnkgZmlyc3QgdG8gY29udmVydCB0byBhIHN0cmluZy4gVGhpcyBpcyBnb29kIGFzIGZhc3QgcGF0aFxuICAgICAgICAgICAgICAgIC8vIGZvciBvbGQgSUUgd2hpY2ggdW5kZXJzdGFuZHMgc3RyaW5nIGluZGV4aW5nIGZvciBzdHJpbmdcbiAgICAgICAgICAgICAgICAvLyBsaXRlcmFscyBvbmx5IGFuZCBub3QgZm9yIHN0cmluZyBvYmplY3QuXG4gICAgICAgICAgICAgICAgaWYgKGNvZGUgaW5zdGFuY2VvZiBTdHJpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgc291cmNlID0gY29kZS52YWx1ZU9mKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gRm9yY2UgYWNjZXNzaW5nIHRoZSBjaGFyYWN0ZXJzIHZpYSBhbiBhcnJheS5cbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHNvdXJjZVswXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgc291cmNlID0gc3RyaW5nVG9BcnJheShjb2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBwYXRjaCgpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcHJvZ3JhbSA9IHBhcnNlUHJvZ3JhbSgpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBleHRyYS5jb21tZW50cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBmaWx0ZXJDb21tZW50TG9jYXRpb24oKTtcbiAgICAgICAgICAgICAgICBwcm9ncmFtLmNvbW1lbnRzID0gZXh0cmEuY29tbWVudHM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIGV4dHJhLnRva2VucyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBmaWx0ZXJUb2tlbkxvY2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgcHJvZ3JhbS50b2tlbnMgPSBleHRyYS50b2tlbnM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIGV4dHJhLmVycm9ycyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBwcm9ncmFtLmVycm9ycyA9IGV4dHJhLmVycm9ycztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChleHRyYS5yYW5nZSB8fCBleHRyYS5sb2MpIHtcbiAgICAgICAgICAgICAgICBwcm9ncmFtLmJvZHkgPSBmaWx0ZXJHcm91cChwcm9ncmFtLmJvZHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdW5wYXRjaCgpO1xuICAgICAgICAgICAgZXh0cmEgPSB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwcm9ncmFtO1xuICAgIH1cblxuICAgIC8vIFN5bmMgd2l0aCBwYWNrYWdlLmpzb24uXG4gICAgZXhwb3J0cy52ZXJzaW9uID0gJzEuMC4zJztcblxuICAgIGV4cG9ydHMucGFyc2UgPSBwYXJzZTtcblxuICAgIC8vIERlZXAgY29weS5cbiAgICBleHBvcnRzLlN5bnRheCA9IChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBuYW1lLCB0eXBlcyA9IHt9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdHlwZXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChuYW1lIGluIFN5bnRheCkge1xuICAgICAgICAgICAgaWYgKFN5bnRheC5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICAgICAgICAgIHR5cGVzW25hbWVdID0gU3ludGF4W25hbWVdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBPYmplY3QuZnJlZXplID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBPYmplY3QuZnJlZXplKHR5cGVzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0eXBlcztcbiAgICB9KCkpO1xuXG59KSk7XG4vKiB2aW06IHNldCBzdz00IHRzPTQgZXQgdHc9ODAgOiAqL1xuIiwiLypcbiAgQ29weXJpZ2h0IChDKSAyMDEyIFl1c3VrZSBTdXp1a2kgPHV0YXRhbmUudGVhQGdtYWlsLmNvbT5cbiAgQ29weXJpZ2h0IChDKSAyMDEyIEFyaXlhIEhpZGF5YXQgPGFyaXlhLmhpZGF5YXRAZ21haWwuY29tPlxuXG4gIFJlZGlzdHJpYnV0aW9uIGFuZCB1c2UgaW4gc291cmNlIGFuZCBiaW5hcnkgZm9ybXMsIHdpdGggb3Igd2l0aG91dFxuICBtb2RpZmljYXRpb24sIGFyZSBwZXJtaXR0ZWQgcHJvdmlkZWQgdGhhdCB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnMgYXJlIG1ldDpcblxuICAgICogUmVkaXN0cmlidXRpb25zIG9mIHNvdXJjZSBjb2RlIG11c3QgcmV0YWluIHRoZSBhYm92ZSBjb3B5cmlnaHRcbiAgICAgIG5vdGljZSwgdGhpcyBsaXN0IG9mIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmcgZGlzY2xhaW1lci5cbiAgICAqIFJlZGlzdHJpYnV0aW9ucyBpbiBiaW5hcnkgZm9ybSBtdXN0IHJlcHJvZHVjZSB0aGUgYWJvdmUgY29weXJpZ2h0XG4gICAgICBub3RpY2UsIHRoaXMgbGlzdCBvZiBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIgaW4gdGhlXG4gICAgICBkb2N1bWVudGF0aW9uIGFuZC9vciBvdGhlciBtYXRlcmlhbHMgcHJvdmlkZWQgd2l0aCB0aGUgZGlzdHJpYnV0aW9uLlxuXG4gIFRISVMgU09GVFdBUkUgSVMgUFJPVklERUQgQlkgVEhFIENPUFlSSUdIVCBIT0xERVJTIEFORCBDT05UUklCVVRPUlMgXCJBUyBJU1wiXG4gIEFORCBBTlkgRVhQUkVTUyBPUiBJTVBMSUVEIFdBUlJBTlRJRVMsIElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBUSEVcbiAgSU1QTElFRCBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSBBTkQgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0VcbiAgQVJFIERJU0NMQUlNRUQuIElOIE5PIEVWRU5UIFNIQUxMIDxDT1BZUklHSFQgSE9MREVSPiBCRSBMSUFCTEUgRk9SIEFOWVxuICBESVJFQ1QsIElORElSRUNULCBJTkNJREVOVEFMLCBTUEVDSUFMLCBFWEVNUExBUlksIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFU1xuICAoSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFBST0NVUkVNRU5UIE9GIFNVQlNUSVRVVEUgR09PRFMgT1IgU0VSVklDRVM7XG4gIExPU1MgT0YgVVNFLCBEQVRBLCBPUiBQUk9GSVRTOyBPUiBCVVNJTkVTUyBJTlRFUlJVUFRJT04pIEhPV0VWRVIgQ0FVU0VEIEFORFxuICBPTiBBTlkgVEhFT1JZIE9GIExJQUJJTElUWSwgV0hFVEhFUiBJTiBDT05UUkFDVCwgU1RSSUNUIExJQUJJTElUWSwgT1IgVE9SVFxuICAoSU5DTFVESU5HIE5FR0xJR0VOQ0UgT1IgT1RIRVJXSVNFKSBBUklTSU5HIElOIEFOWSBXQVkgT1VUIE9GIFRIRSBVU0UgT0ZcbiAgVEhJUyBTT0ZUV0FSRSwgRVZFTiBJRiBBRFZJU0VEIE9GIFRIRSBQT1NTSUJJTElUWSBPRiBTVUNIIERBTUFHRS5cbiovXG5cbi8qanNsaW50IGJpdHdpc2U6dHJ1ZSAqL1xuLypnbG9iYWwgZXhwb3J0czp0cnVlLCBkZWZpbmU6dHJ1ZSwgd2luZG93OnRydWUgKi9cbihmdW5jdGlvbiAoZmFjdG9yeSkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIFVuaXZlcnNhbCBNb2R1bGUgRGVmaW5pdGlvbiAoVU1EKSB0byBzdXBwb3J0IEFNRCwgQ29tbW9uSlMvTm9kZS5qcyxcbiAgICAvLyBhbmQgcGxhaW4gYnJvd3NlciBsb2FkaW5nLFxuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKFsnZXhwb3J0cyddLCBmYWN0b3J5KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBmYWN0b3J5KGV4cG9ydHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZhY3RvcnkoKHdpbmRvdy5lc3RyYXZlcnNlID0ge30pKTtcbiAgICB9XG59KGZ1bmN0aW9uIChleHBvcnRzKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIFN5bnRheCxcbiAgICAgICAgaXNBcnJheSxcbiAgICAgICAgVmlzaXRvck9wdGlvbixcbiAgICAgICAgVmlzaXRvcktleXMsXG4gICAgICAgIHdyYXBwZXJzO1xuXG4gICAgU3ludGF4ID0ge1xuICAgICAgICBBc3NpZ25tZW50RXhwcmVzc2lvbjogJ0Fzc2lnbm1lbnRFeHByZXNzaW9uJyxcbiAgICAgICAgQXJyYXlFeHByZXNzaW9uOiAnQXJyYXlFeHByZXNzaW9uJyxcbiAgICAgICAgQmxvY2tTdGF0ZW1lbnQ6ICdCbG9ja1N0YXRlbWVudCcsXG4gICAgICAgIEJpbmFyeUV4cHJlc3Npb246ICdCaW5hcnlFeHByZXNzaW9uJyxcbiAgICAgICAgQnJlYWtTdGF0ZW1lbnQ6ICdCcmVha1N0YXRlbWVudCcsXG4gICAgICAgIENhbGxFeHByZXNzaW9uOiAnQ2FsbEV4cHJlc3Npb24nLFxuICAgICAgICBDYXRjaENsYXVzZTogJ0NhdGNoQ2xhdXNlJyxcbiAgICAgICAgQ29uZGl0aW9uYWxFeHByZXNzaW9uOiAnQ29uZGl0aW9uYWxFeHByZXNzaW9uJyxcbiAgICAgICAgQ29udGludWVTdGF0ZW1lbnQ6ICdDb250aW51ZVN0YXRlbWVudCcsXG4gICAgICAgIERlYnVnZ2VyU3RhdGVtZW50OiAnRGVidWdnZXJTdGF0ZW1lbnQnLFxuICAgICAgICBEaXJlY3RpdmVTdGF0ZW1lbnQ6ICdEaXJlY3RpdmVTdGF0ZW1lbnQnLFxuICAgICAgICBEb1doaWxlU3RhdGVtZW50OiAnRG9XaGlsZVN0YXRlbWVudCcsXG4gICAgICAgIEVtcHR5U3RhdGVtZW50OiAnRW1wdHlTdGF0ZW1lbnQnLFxuICAgICAgICBFeHByZXNzaW9uU3RhdGVtZW50OiAnRXhwcmVzc2lvblN0YXRlbWVudCcsXG4gICAgICAgIEZvclN0YXRlbWVudDogJ0ZvclN0YXRlbWVudCcsXG4gICAgICAgIEZvckluU3RhdGVtZW50OiAnRm9ySW5TdGF0ZW1lbnQnLFxuICAgICAgICBGdW5jdGlvbkRlY2xhcmF0aW9uOiAnRnVuY3Rpb25EZWNsYXJhdGlvbicsXG4gICAgICAgIEZ1bmN0aW9uRXhwcmVzc2lvbjogJ0Z1bmN0aW9uRXhwcmVzc2lvbicsXG4gICAgICAgIElkZW50aWZpZXI6ICdJZGVudGlmaWVyJyxcbiAgICAgICAgSWZTdGF0ZW1lbnQ6ICdJZlN0YXRlbWVudCcsXG4gICAgICAgIExpdGVyYWw6ICdMaXRlcmFsJyxcbiAgICAgICAgTGFiZWxlZFN0YXRlbWVudDogJ0xhYmVsZWRTdGF0ZW1lbnQnLFxuICAgICAgICBMb2dpY2FsRXhwcmVzc2lvbjogJ0xvZ2ljYWxFeHByZXNzaW9uJyxcbiAgICAgICAgTWVtYmVyRXhwcmVzc2lvbjogJ01lbWJlckV4cHJlc3Npb24nLFxuICAgICAgICBOZXdFeHByZXNzaW9uOiAnTmV3RXhwcmVzc2lvbicsXG4gICAgICAgIE9iamVjdEV4cHJlc3Npb246ICdPYmplY3RFeHByZXNzaW9uJyxcbiAgICAgICAgUHJvZ3JhbTogJ1Byb2dyYW0nLFxuICAgICAgICBQcm9wZXJ0eTogJ1Byb3BlcnR5JyxcbiAgICAgICAgUmV0dXJuU3RhdGVtZW50OiAnUmV0dXJuU3RhdGVtZW50JyxcbiAgICAgICAgU2VxdWVuY2VFeHByZXNzaW9uOiAnU2VxdWVuY2VFeHByZXNzaW9uJyxcbiAgICAgICAgU3dpdGNoU3RhdGVtZW50OiAnU3dpdGNoU3RhdGVtZW50JyxcbiAgICAgICAgU3dpdGNoQ2FzZTogJ1N3aXRjaENhc2UnLFxuICAgICAgICBUaGlzRXhwcmVzc2lvbjogJ1RoaXNFeHByZXNzaW9uJyxcbiAgICAgICAgVGhyb3dTdGF0ZW1lbnQ6ICdUaHJvd1N0YXRlbWVudCcsXG4gICAgICAgIFRyeVN0YXRlbWVudDogJ1RyeVN0YXRlbWVudCcsXG4gICAgICAgIFVuYXJ5RXhwcmVzc2lvbjogJ1VuYXJ5RXhwcmVzc2lvbicsXG4gICAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdVcGRhdGVFeHByZXNzaW9uJyxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdGlvbjogJ1ZhcmlhYmxlRGVjbGFyYXRpb24nLFxuICAgICAgICBWYXJpYWJsZURlY2xhcmF0b3I6ICdWYXJpYWJsZURlY2xhcmF0b3InLFxuICAgICAgICBXaGlsZVN0YXRlbWVudDogJ1doaWxlU3RhdGVtZW50JyxcbiAgICAgICAgV2l0aFN0YXRlbWVudDogJ1dpdGhTdGF0ZW1lbnQnXG4gICAgfTtcblxuICAgIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuICAgIGlmICghaXNBcnJheSkge1xuICAgICAgICBpc0FycmF5ID0gZnVuY3Rpb24gaXNBcnJheShhcnJheSkge1xuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcnJheSkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgVmlzaXRvcktleXMgPSB7XG4gICAgICAgIEFzc2lnbm1lbnRFeHByZXNzaW9uOiBbJ2xlZnQnLCAncmlnaHQnXSxcbiAgICAgICAgQXJyYXlFeHByZXNzaW9uOiBbJ2VsZW1lbnRzJ10sXG4gICAgICAgIEJsb2NrU3RhdGVtZW50OiBbJ2JvZHknXSxcbiAgICAgICAgQmluYXJ5RXhwcmVzc2lvbjogWydsZWZ0JywgJ3JpZ2h0J10sXG4gICAgICAgIEJyZWFrU3RhdGVtZW50OiBbJ2xhYmVsJ10sXG4gICAgICAgIENhbGxFeHByZXNzaW9uOiBbJ2NhbGxlZScsICdhcmd1bWVudHMnXSxcbiAgICAgICAgQ2F0Y2hDbGF1c2U6IFsncGFyYW0nLCAnYm9keSddLFxuICAgICAgICBDb25kaXRpb25hbEV4cHJlc3Npb246IFsndGVzdCcsICdjb25zZXF1ZW50JywgJ2FsdGVybmF0ZSddLFxuICAgICAgICBDb250aW51ZVN0YXRlbWVudDogWydsYWJlbCddLFxuICAgICAgICBEZWJ1Z2dlclN0YXRlbWVudDogW10sXG4gICAgICAgIERpcmVjdGl2ZVN0YXRlbWVudDogW10sXG4gICAgICAgIERvV2hpbGVTdGF0ZW1lbnQ6IFsnYm9keScsICd0ZXN0J10sXG4gICAgICAgIEVtcHR5U3RhdGVtZW50OiBbXSxcbiAgICAgICAgRXhwcmVzc2lvblN0YXRlbWVudDogWydleHByZXNzaW9uJ10sXG4gICAgICAgIEZvclN0YXRlbWVudDogWydpbml0JywgJ3Rlc3QnLCAndXBkYXRlJywgJ2JvZHknXSxcbiAgICAgICAgRm9ySW5TdGF0ZW1lbnQ6IFsnbGVmdCcsICdyaWdodCcsICdib2R5J10sXG4gICAgICAgIEZ1bmN0aW9uRGVjbGFyYXRpb246IFsnaWQnLCAncGFyYW1zJywgJ2JvZHknXSxcbiAgICAgICAgRnVuY3Rpb25FeHByZXNzaW9uOiBbJ2lkJywgJ3BhcmFtcycsICdib2R5J10sXG4gICAgICAgIElkZW50aWZpZXI6IFtdLFxuICAgICAgICBJZlN0YXRlbWVudDogWyd0ZXN0JywgJ2NvbnNlcXVlbnQnLCAnYWx0ZXJuYXRlJ10sXG4gICAgICAgIExpdGVyYWw6IFtdLFxuICAgICAgICBMYWJlbGVkU3RhdGVtZW50OiBbJ2xhYmVsJywgJ2JvZHknXSxcbiAgICAgICAgTG9naWNhbEV4cHJlc3Npb246IFsnbGVmdCcsICdyaWdodCddLFxuICAgICAgICBNZW1iZXJFeHByZXNzaW9uOiBbJ29iamVjdCcsICdwcm9wZXJ0eSddLFxuICAgICAgICBOZXdFeHByZXNzaW9uOiBbJ2NhbGxlZScsICdhcmd1bWVudHMnXSxcbiAgICAgICAgT2JqZWN0RXhwcmVzc2lvbjogWydwcm9wZXJ0aWVzJ10sXG4gICAgICAgIFByb2dyYW06IFsnYm9keSddLFxuICAgICAgICBQcm9wZXJ0eTogWydrZXknLCAndmFsdWUnXSxcbiAgICAgICAgUmV0dXJuU3RhdGVtZW50OiBbJ2FyZ3VtZW50J10sXG4gICAgICAgIFNlcXVlbmNlRXhwcmVzc2lvbjogWydleHByZXNzaW9ucyddLFxuICAgICAgICBTd2l0Y2hTdGF0ZW1lbnQ6IFsnZGlzY3JpbWluYW50JywgJ2Nhc2VzJ10sXG4gICAgICAgIFN3aXRjaENhc2U6IFsndGVzdCcsICdjb25zZXF1ZW50J10sXG4gICAgICAgIFRoaXNFeHByZXNzaW9uOiBbXSxcbiAgICAgICAgVGhyb3dTdGF0ZW1lbnQ6IFsnYXJndW1lbnQnXSxcbiAgICAgICAgVHJ5U3RhdGVtZW50OiBbJ2Jsb2NrJywgJ2hhbmRsZXJzJywgJ2ZpbmFsaXplciddLFxuICAgICAgICBVbmFyeUV4cHJlc3Npb246IFsnYXJndW1lbnQnXSxcbiAgICAgICAgVXBkYXRlRXhwcmVzc2lvbjogWydhcmd1bWVudCddLFxuICAgICAgICBWYXJpYWJsZURlY2xhcmF0aW9uOiBbJ2RlY2xhcmF0aW9ucyddLFxuICAgICAgICBWYXJpYWJsZURlY2xhcmF0b3I6IFsnaWQnLCAnaW5pdCddLFxuICAgICAgICBXaGlsZVN0YXRlbWVudDogWyd0ZXN0JywgJ2JvZHknXSxcbiAgICAgICAgV2l0aFN0YXRlbWVudDogWydvYmplY3QnLCAnYm9keSddXG4gICAgfTtcblxuICAgIFZpc2l0b3JPcHRpb24gPSB7XG4gICAgICAgIEJyZWFrOiAxLFxuICAgICAgICBTa2lwOiAyXG4gICAgfTtcblxuICAgIHdyYXBwZXJzID0ge1xuICAgICAgICBQcm9wZXJ0eVdyYXBwZXI6ICdQcm9wZXJ0eSdcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gdHJhdmVyc2UodG9wLCB2aXNpdG9yKSB7XG4gICAgICAgIHZhciB3b3JrbGlzdCwgbGVhdmVsaXN0LCBub2RlLCBub2RlVHlwZSwgcmV0LCBjdXJyZW50LCBjdXJyZW50MiwgY2FuZGlkYXRlcywgY2FuZGlkYXRlLCBtYXJrZXIgPSB7fTtcblxuICAgICAgICB3b3JrbGlzdCA9IFsgdG9wIF07XG4gICAgICAgIGxlYXZlbGlzdCA9IFsgbnVsbCBdO1xuXG4gICAgICAgIHdoaWxlICh3b3JrbGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIG5vZGUgPSB3b3JrbGlzdC5wb3AoKTtcbiAgICAgICAgICAgIG5vZGVUeXBlID0gbm9kZS50eXBlO1xuXG4gICAgICAgICAgICBpZiAobm9kZSA9PT0gbWFya2VyKSB7XG4gICAgICAgICAgICAgICAgbm9kZSA9IGxlYXZlbGlzdC5wb3AoKTtcbiAgICAgICAgICAgICAgICBpZiAodmlzaXRvci5sZWF2ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXQgPSB2aXNpdG9yLmxlYXZlKG5vZGUsIGxlYXZlbGlzdFtsZWF2ZWxpc3QubGVuZ3RoIC0gMV0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHJldCA9PT0gVmlzaXRvck9wdGlvbi5CcmVhaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChub2RlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHdyYXBwZXJzLmhhc093blByb3BlcnR5KG5vZGVUeXBlKSkge1xuICAgICAgICAgICAgICAgICAgICBub2RlID0gbm9kZS5ub2RlO1xuICAgICAgICAgICAgICAgICAgICBub2RlVHlwZSA9IHdyYXBwZXJzW25vZGVUeXBlXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAodmlzaXRvci5lbnRlcikge1xuICAgICAgICAgICAgICAgICAgICByZXQgPSB2aXNpdG9yLmVudGVyKG5vZGUsIGxlYXZlbGlzdFtsZWF2ZWxpc3QubGVuZ3RoIC0gMV0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocmV0ID09PSBWaXNpdG9yT3B0aW9uLkJyZWFrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB3b3JrbGlzdC5wdXNoKG1hcmtlcik7XG4gICAgICAgICAgICAgICAgbGVhdmVsaXN0LnB1c2gobm9kZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAocmV0ICE9PSBWaXNpdG9yT3B0aW9uLlNraXApIHtcbiAgICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlcyA9IFZpc2l0b3JLZXlzW25vZGVUeXBlXTtcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudCA9IGNhbmRpZGF0ZXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoKGN1cnJlbnQgLT0gMSkgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlID0gbm9kZVtjYW5kaWRhdGVzW2N1cnJlbnRdXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjYW5kaWRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNBcnJheShjYW5kaWRhdGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnQyID0gY2FuZGlkYXRlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKChjdXJyZW50MiAtPSAxKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FuZGlkYXRlW2N1cnJlbnQyXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKG5vZGVUeXBlID09PSBTeW50YXguT2JqZWN0RXhwcmVzc2lvbiAmJiAncHJvcGVydGllcycgPT09IGNhbmRpZGF0ZXNbY3VycmVudF0gJiYgbnVsbCA9PSBjYW5kaWRhdGVzW2N1cnJlbnRdLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaCh7dHlwZTogJ1Byb3BlcnR5V3JhcHBlcicsIG5vZGU6IGNhbmRpZGF0ZVtjdXJyZW50Ml19KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JrbGlzdC5wdXNoKGNhbmRpZGF0ZVtjdXJyZW50Ml0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtsaXN0LnB1c2goY2FuZGlkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXBsYWNlKHRvcCwgdmlzaXRvcikge1xuICAgICAgICB2YXIgd29ya2xpc3QsIGxlYXZlbGlzdCwgbm9kZSwgbm9kZVR5cGUsIHRhcmdldCwgdHVwbGUsIHJldCwgY3VycmVudCwgY3VycmVudDIsIGNhbmRpZGF0ZXMsIGNhbmRpZGF0ZSwgbWFya2VyID0ge30sIHJlc3VsdDtcblxuICAgICAgICByZXN1bHQgPSB7XG4gICAgICAgICAgICB0b3A6IHRvcFxuICAgICAgICB9O1xuXG4gICAgICAgIHR1cGxlID0gWyB0b3AsIHJlc3VsdCwgJ3RvcCcgXTtcbiAgICAgICAgd29ya2xpc3QgPSBbIHR1cGxlIF07XG4gICAgICAgIGxlYXZlbGlzdCA9IFsgdHVwbGUgXTtcblxuICAgICAgICBmdW5jdGlvbiBub3RpZnkodikge1xuICAgICAgICAgICAgcmV0ID0gdjtcbiAgICAgICAgfVxuXG4gICAgICAgIHdoaWxlICh3b3JrbGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHR1cGxlID0gd29ya2xpc3QucG9wKCk7XG5cbiAgICAgICAgICAgIGlmICh0dXBsZSA9PT0gbWFya2VyKSB7XG4gICAgICAgICAgICAgICAgdHVwbGUgPSBsZWF2ZWxpc3QucG9wKCk7XG4gICAgICAgICAgICAgICAgcmV0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIGlmICh2aXNpdG9yLmxlYXZlKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUgPSB0dXBsZVswXTtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0ID0gdmlzaXRvci5sZWF2ZSh0dXBsZVswXSwgbGVhdmVsaXN0W2xlYXZlbGlzdC5sZW5ndGggLSAxXVswXSwgbm90aWZ5KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRhcmdldCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlID0gdGFyZ2V0O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHR1cGxlWzFdW3R1cGxlWzJdXSA9IG5vZGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChyZXQgPT09IFZpc2l0b3JPcHRpb24uQnJlYWspIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdC50b3A7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0dXBsZVswXSkge1xuICAgICAgICAgICAgICAgIHJldCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBub2RlID0gdHVwbGVbMF07XG5cbiAgICAgICAgICAgICAgICBub2RlVHlwZSA9IG5vZGUudHlwZTtcbiAgICAgICAgICAgICAgICBpZiAod3JhcHBlcnMuaGFzT3duUHJvcGVydHkobm9kZVR5cGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHR1cGxlWzBdID0gbm9kZSA9IG5vZGUubm9kZTtcbiAgICAgICAgICAgICAgICAgICAgbm9kZVR5cGUgPSB3cmFwcGVyc1tub2RlVHlwZV07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHZpc2l0b3IuZW50ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0ID0gdmlzaXRvci5lbnRlcih0dXBsZVswXSwgbGVhdmVsaXN0W2xlYXZlbGlzdC5sZW5ndGggLSAxXVswXSwgbm90aWZ5KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRhcmdldCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlID0gdGFyZ2V0O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHR1cGxlWzFdW3R1cGxlWzJdXSA9IG5vZGU7XG4gICAgICAgICAgICAgICAgICAgIHR1cGxlWzBdID0gbm9kZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocmV0ID09PSBWaXNpdG9yT3B0aW9uLkJyZWFrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQudG9wO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICh0dXBsZVswXSkge1xuICAgICAgICAgICAgICAgICAgICB3b3JrbGlzdC5wdXNoKG1hcmtlcik7XG4gICAgICAgICAgICAgICAgICAgIGxlYXZlbGlzdC5wdXNoKHR1cGxlKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAocmV0ICE9PSBWaXNpdG9yT3B0aW9uLlNraXApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZXMgPSBWaXNpdG9yS2V5c1tub2RlVHlwZV07XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50ID0gY2FuZGlkYXRlcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAoKGN1cnJlbnQgLT0gMSkgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZSA9IG5vZGVbY2FuZGlkYXRlc1tjdXJyZW50XV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNBcnJheShjYW5kaWRhdGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50MiA9IGNhbmRpZGF0ZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAoKGN1cnJlbnQyIC09IDEpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FuZGlkYXRlW2N1cnJlbnQyXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihub2RlVHlwZSA9PT0gU3ludGF4Lk9iamVjdEV4cHJlc3Npb24gJiYgJ3Byb3BlcnRpZXMnID09PSBjYW5kaWRhdGVzW2N1cnJlbnRdICYmIG51bGwgPT0gY2FuZGlkYXRlc1tjdXJyZW50XS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JrbGlzdC5wdXNoKFt7dHlwZTogJ1Byb3BlcnR5V3JhcHBlcicsIG5vZGU6IGNhbmRpZGF0ZVtjdXJyZW50Ml19LCBjYW5kaWRhdGUsIGN1cnJlbnQyXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JrbGlzdC5wdXNoKFtjYW5kaWRhdGVbY3VycmVudDJdLCBjYW5kaWRhdGUsIGN1cnJlbnQyXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JrbGlzdC5wdXNoKFtjYW5kaWRhdGUsIG5vZGUsIGNhbmRpZGF0ZXNbY3VycmVudF1dKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQudG9wO1xuICAgIH1cblxuICAgIGV4cG9ydHMudmVyc2lvbiA9ICcwLjAuNCc7XG4gICAgZXhwb3J0cy5TeW50YXggPSBTeW50YXg7XG4gICAgZXhwb3J0cy50cmF2ZXJzZSA9IHRyYXZlcnNlO1xuICAgIGV4cG9ydHMucmVwbGFjZSA9IHJlcGxhY2U7XG4gICAgZXhwb3J0cy5WaXNpdG9yS2V5cyA9IFZpc2l0b3JLZXlzO1xuICAgIGV4cG9ydHMuVmlzaXRvck9wdGlvbiA9IFZpc2l0b3JPcHRpb247XG59KSk7XG4vKiB2aW06IHNldCBzdz00IHRzPTQgZXQgdHc9ODAgOiAqL1xuIiwiKGZ1bmN0aW9uIChucykge1xuXG4gICAgdmFyIHdhbGsgPSByZXF1aXJlKCdlc3RyYXZlcnNlJyksXG4gICAgICAgIENvbnRleHQgPSByZXF1aXJlKFwiLi8uLi9iYXNlL2NvbnRleHQuanNcIikuZ2V0Q29udGV4dChudWxsKSxcbiAgICAgICAgU3ludGF4ID0gd2Fsay5TeW50YXg7XG5cbiAgICB2YXIgZmluZFBhcmFtZXRlcnNJblByb2dyYW0gPSBmdW5jdGlvbiAocHJvZ3JhbSwgY29udGV4dE5hbWUsIHBhcmFtLCBhbmFseXplZENhbGxzKSB7XG4gICAgICAgIHZhciBjb250ZXh0U3RhY2sgPSBbbmV3IENvbnRleHQocHJvZ3JhbSwgbnVsbCwge25hbWU6IFwiZ2xvYmFsXCJ9KV07XG4gICAgICAgIHZhciBmb3VuZFBhcmFtcyA9IFtdO1xuICAgICAgICBhbmFseXplZENhbGxzID0gYW5hbHl6ZWRDYWxscyB8fCB7fTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIkxvb2tpbmcgZm9yOiBcIiwgY29udGV4dE5hbWUsIHBhcmFtKTtcblxuICAgICAgICB2YXIgYWN0aXZlUGFyYW0gPSBudWxsO1xuICAgICAgICB3YWxrLnRyYXZlcnNlKHByb2dyYW0sIHtcbiAgICAgICAgICAgIGVudGVyOiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgICAgIHZhciB0eXBlID0gbm9kZS50eXBlLFxuICAgICAgICAgICAgICAgICAgICBjb250ZXh0O1xuICAgICAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmVudENvbnRleHQgPSBjb250ZXh0U3RhY2tbY29udGV4dFN0YWNrLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50Q29udGV4dC5kZWNsYXJlVmFyaWFibGUobm9kZS5pZC5uYW1lLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0ID0gbmV3IENvbnRleHQobm9kZSwgcGFyZW50Q29udGV4dCwge25hbWU6IG5vZGUuaWQubmFtZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHRTdGFjay5wdXNoKGNvbnRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRleHQuc3RyKCkgPT0gY29udGV4dE5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5wYXJhbXMubGVuZ3RoID4gcGFyYW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlUGFyYW0gPSBub2RlLnBhcmFtc1twYXJhbV0ubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQ2FsbEV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcG9zID0gbm9kZS5hcmd1bWVudHMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBjdXJyLCBpbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJyLm5hbWUgPT0gYWN0aXZlUGFyYW0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIC0xKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwb3MgIT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0ID0gY29udGV4dFN0YWNrW2NvbnRleHRTdGFjay5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaWQgPSBjb250ZXh0LmdldFZhcmlhYmxlSWRlbnRpZmllcihub2RlLmNhbGxlZS5uYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWFuYWx5emVkQ2FsbHNbaWRdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuYWx5emVkQ2FsbHNbaWRdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm91bmRQYXJhbXMgPSBmb3VuZFBhcmFtcy5jb25jYXQoZmluZFBhcmFtZXRlcnNJblByb2dyYW0ocHJvZ3JhbSwgaWQsIHBvcywgYW5hbHl6ZWRDYWxscykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxlYXZlOiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgICAgIHZhciB0eXBlID0gbm9kZS50eXBlO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dFN0YWNrLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlUGFyYW0gPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4Lk1lbWJlckV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0aXZlUGFyYW0gJiYgbm9kZS5vYmplY3QubmFtZSA9PSBhY3RpdmVQYXJhbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbWV0ZXJOYW1lID0gbm9kZS5wcm9wZXJ0eS5uYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmb3VuZFBhcmFtcy5pbmRleE9mKHBhcmFtZXRlck5hbWUpID09IC0xKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3VuZFBhcmFtcy5wdXNoKHBhcmFtZXRlck5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gZm91bmRQYXJhbXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7b2JqZWN0IX0gcHJvZ3JhbVxuICAgICAqIEBwYXJhbSB7b2JqZWN0P30gb3B0XG4gICAgICovXG4gICAgbnMuZXh0cmFjdFBhcmFtZXRlcnMgPSBmdW5jdGlvbiAocHJvZ3JhbSwgb3B0KSB7XG4gICAgICAgIG9wdCA9IG9wdCB8fCB7fTtcbiAgICAgICAgdmFyIGNvbnRleHQgPSBvcHQuY29udGV4dCB8fCBcImdsb2JhbC5zaGFkZVwiO1xuICAgICAgICB2YXIgcGFyYW0gPSBvcHQucGFyYW0gfHwgMDtcblxuICAgICAgICByZXR1cm4gZmluZFBhcmFtZXRlcnNJblByb2dyYW0ocHJvZ3JhbSwgY29udGV4dCwgcGFyYW0pO1xuICAgIH07XG5cblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24gKG5zKSB7XG5cbiAgICB2YXIgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheCxcbiAgICAgICAgVmlzaXRvck9wdGlvbiA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5WaXNpdG9yT3B0aW9uLFxuICAgICAgICBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi9pbnRlcmZhY2VzLmpzXCIpLFxuICAgICAgICBUWVBFUyA9IFNoYWRlLlRZUEVTLFxuICAgICAgICBBbm5vdGF0aW9uID0gcmVxdWlyZShcIi4vLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkFubm90YXRpb24sXG4gICAgICAgIEJhc2UgPSByZXF1aXJlKFwiLi8uLi8uLi9iYXNlL2luZGV4LmpzXCIpO1xuXG5cbiAgICB2YXIgQmluYXJ5RnVuY3Rpb25zID0ge1xuICAgICAgICBcIitcIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSArIGI7IH0sXG4gICAgICAgIFwiLVwiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhIC0gYjsgfSxcbiAgICAgICAgXCIvXCIgOiBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGEgLyBiOyB9LFxuICAgICAgICBcIipcIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSAqIGI7IH0sXG4gICAgICAgIFwiJVwiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhICUgYjsgfSxcblxuICAgICAgICBcIj09XCIgOiBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGEgPT0gYjsgfSxcbiAgICAgICAgXCIhPVwiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhICE9IGI7IH0sXG4gICAgICAgIFwiPT09XCIgOiBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGEgPT09IGI7IH0sXG4gICAgICAgIFwiIT09XCIgOiBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGEgIT09IGI7IH0sXG4gICAgICAgIFwiPFwiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhIDwgYjsgfSxcbiAgICAgICAgXCI8PVwiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhIDw9IGI7IH0sXG4gICAgICAgIFwiPlwiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhID4gYjsgfSxcbiAgICAgICAgXCI+PVwiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhID49IGI7IH1cbiAgICAgICAgfTtcblxuICAgIHZhciBVbmFyeUZ1bmN0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBcIiFcIjogZnVuY3Rpb24oYSkgeyByZXR1cm4gIWE7IH0sXG4gICAgICAgICAgICAgICAgXCItXCI6IGZ1bmN0aW9uKGEpIHsgcmV0dXJuIC1hOyB9LFxuICAgICAgICAgICAgICAgIFwiK1wiOiBmdW5jdGlvbihhKSB7IHJldHVybiArYTsgfSxcbiAgICAgICAgICAgICAgICBcInR5cGVvZlwiOiBmdW5jdGlvbihhKSB7IHJldHVybiB0eXBlb2YgYTsgfSxcbiAgICAgICAgICAgICAgICBcInZvaWRcIjogZnVuY3Rpb24oYSkgeyByZXR1cm4gdm9pZCBhOyB9LFxuICAgICAgICAgICAgICAgIFwiZGVsZXRlXCI6IGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGRlbGV0ZSBhOyB9XG5cbiAgICB9O1xuXG5cbiAgICBmdW5jdGlvbiBnZXRPYmplY3RSZWZlcmVuY2VGcm9tTm9kZShvYmplY3QsIGNvbnRleHQpIHtcbiAgICAgICAgc3dpdGNoIChvYmplY3QudHlwZSkge1xuICAgICAgICAgICAgY2FzZSBTeW50YXguTmV3RXhwcmVzc2lvbjpcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkNhbGxFeHByZXNzaW9uOlxuICAgICAgICAgICAgY2FzZSBTeW50YXguTWVtYmVyRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICByZXR1cm4gY29udGV4dC5jcmVhdGVUeXBlSW5mbyhvYmplY3QpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguSWRlbnRpZmllcjpcbiAgICAgICAgICAgICAgICByZXR1cm4gY29udGV4dC5nZXRCaW5kaW5nQnlOYW1lKG9iamVjdC5uYW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlRoaXNFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIHJldHVybiBjb250ZXh0LmdldEJpbmRpbmdCeU5hbWUoXCJ0aGlzXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmhhbmRsZWQgb2JqZWN0IHR5cGUgaW4gVHlwZUluZmVyZW5jZTogXCIgKyBvYmplY3QudHlwZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgZXZhbHVhdGVUcnV0aCA9IGZ1bmN0aW9uKGV4cCkge1xuICAgICAgICByZXR1cm4gISFleHA7XG4gICAgfVxuXG4gICAgdmFyIGxvZyA9IGZ1bmN0aW9uKHN0cikge307XG4gICAgLy92YXIgbG9nID0gZnVuY3Rpb24oKSB7IGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIGFyZ3VtZW50cyk7IH07XG5cblxuICAgIHZhciBlbnRlckhhbmRsZXJzID0ge1xuICAgICAgICAvLyBPbiBlbnRlclxuICAgICAgICBDb25kaXRpb25hbEV4cHJlc3Npb246IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQsIGN0eCwgcm9vdCkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUpO1xuXG4gICAgICAgICAgICByb290LnRyYXZlcnNlKG5vZGUudGVzdCk7XG4gICAgICAgICAgICB2YXIgdGVzdCA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLnRlc3QpO1xuXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhub2RlLnRlc3QsIG5vZGUuY29uc2VxdWVudCwgbm9kZS5hbHRlcm5hdGUpO1xuICAgICAgICAgICAgaWYgKHRlc3QuaGFzU3RhdGljVmFsdWUoKSkge1xuICAgICAgICAgICAgICAgIHZhciB0ZXN0UmVzdWx0ID0gZXZhbHVhdGVUcnV0aCh0ZXN0LmdldFN0YXRpY1ZhbHVlKCkpO1xuICAgICAgICAgICAgICAgIGlmICh0ZXN0UmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS5jb25zZXF1ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgY29uc2VxdWVudCA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLmNvbnNlcXVlbnQpO1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuY29weShjb25zZXF1ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFsdGVybmF0ZSA9IG5ldyBBbm5vdGF0aW9uKG5vZGUuYWx0ZXJuYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgYWx0ZXJuYXRlLmVsaW1pbmF0ZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS5hbHRlcm5hdGUpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgYWx0ZXJuYXRlID0gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUuYWx0ZXJuYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmNvcHkoYWx0ZXJuYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnNlcXVlbnQgPSBuZXcgQW5ub3RhdGlvbihub2RlLmNvbnNlcXVlbnQpO1xuICAgICAgICAgICAgICAgICAgICBjb25zZXF1ZW50LmVsaW1pbmF0ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gV2UgY2FuJ3QgZGVjaWRlLCB0aHVzIHRyYXZlcnNlIGJvdGg7XG4gICAgICAgICAgICAgICAgcm9vdC50cmF2ZXJzZShub2RlLmNvbnNlcXVlbnQpO1xuICAgICAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS5hbHRlcm5hdGUpO1xuICAgICAgICAgICAgICAgIHZhciBjb25zZXF1ZW50ID0gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUuY29uc2VxdWVudCksXG4gICAgICAgICAgICAgICAgICAgIGFsdGVybmF0ZSA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLmFsdGVybmF0ZSk7XG5cblxuICAgICAgICAgICAgICAgIGlmIChjb25zZXF1ZW50LmVxdWFscyhhbHRlcm5hdGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5jb3B5KGNvbnNlcXVlbnQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY29uc2VxdWVudC5jYW5OdW1iZXIoKSAmJiBhbHRlcm5hdGUuY2FuTnVtYmVyKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuTlVNQkVSKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodGVzdC5pc051bGxPclVuZGVmaW5lZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKGFsdGVybmF0ZS5nZXRUeXBlKCkpXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gV2UgZG9uJ3QgYWxsb3cgZHluYW1pYyB0eXBlcyAodGhlIHR5cGUgb2YgdGhlIHJlc3VsdCBkZXBlbmRzIG9uIHRoZSB2YWx1ZSBvZiBpdCdzIG9wZXJhbmRzKS5cbiAgICAgICAgICAgICAgICAgICAgLy8gQXQgdGhpcyBwb2ludCwgdGhlIGV4cHJlc3Npb24gbmVlZHMgdG8gZXZhbHVhdGUgdG8gYSByZXN1bHQsIG90aGVyd2lzZSBpdCdzIGFuIGVycm9yXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJTdGF0aWMgZXZhbHVhdGlvbiBub3QgaW1wbGVtZW50ZWQgeWV0XCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBWaXNpdG9yT3B0aW9uLlNraXA7XG5cbiAgICAgICAgfSxcbiAgICAgICAgTGl0ZXJhbDogZnVuY3Rpb24gKGxpdGVyYWwpIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2cobGl0ZXJhbCk7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBsaXRlcmFsLnJhdyAhPT0gdW5kZWZpbmVkID8gbGl0ZXJhbC5yYXcgOiBsaXRlcmFsLnZhbHVlLFxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IG5ldyBBbm5vdGF0aW9uKGxpdGVyYWwpO1xuXG4gICAgICAgICAgICB2YXIgbnVtYmVyID0gcGFyc2VGbG9hdCh2YWx1ZSk7XG5cbiAgICAgICAgICAgIGlmICghaXNOYU4obnVtYmVyKSkge1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZS5pbmRleE9mKFwiLlwiKSA9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5JTlQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuTlVNQkVSKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFN0YXRpY1ZhbHVlKG51bWJlcik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHZhbHVlID09PSAndHJ1ZScpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5CT09MRUFOKTtcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0U3RhdGljVmFsdWUodHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHZhbHVlID09PSAnZmFsc2UnKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuQk9PTEVBTik7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFN0YXRpY1ZhbHVlKGZhbHNlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWUgPT09ICdudWxsJykge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLk5VTEwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5TVFJJTkcpO1xuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRTdGF0aWNWYWx1ZSh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgaGFuZGxlcnMgPSB7XG4gICAgICAgIEFzc2lnbm1lbnRFeHByZXNzaW9uOiBmdW5jdGlvbiAobm9kZSwgY3R4KSB7XG4gICAgICAgICAgICB2YXIgcmlnaHQgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZS5yaWdodCksXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obm9kZSk7XG5cbiAgICAgICAgICAgIHJlc3VsdC5jb3B5KHJpZ2h0KTtcbiAgICAgICAgICAgIGlmIChub2RlLmxlZnQudHlwZSA9PSBTeW50YXguSWRlbnRpZmllcikge1xuICAgICAgICAgICAgICAgIHZhciBuYW1lID0gbm9kZS5sZWZ0Lm5hbWU7XG4gICAgICAgICAgICAgICAgaWYgKGN0eC5pbkRlY2xhcmF0aW9uID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eC5kZWNsYXJlVmFyaWFibGUobmFtZSwgdHJ1ZSwgcmVzdWx0KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdHgudXBkYXRlRXhwcmVzc2lvbihuYW1lLCByaWdodCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkFzc2lnbm1lbnQgZXhwcmVzc2lvblwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuXG4gICAgICAgIE5ld0V4cHJlc3Npb246IGZ1bmN0aW9uKG5vZGUsIHBhcmVudCwgY3R4KSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obm9kZSk7XG5cbiAgICAgICAgICAgIHZhciBlbnRyeSA9IGN0eC5nZXRCaW5kaW5nQnlOYW1lKG5vZGUuY2FsbGVlLm5hbWUpO1xuICAgICAgICAgICAgLy9jb25zb2xlLmVycm9yKGVudHJ5KTtcbiAgICAgICAgICAgIGlmIChlbnRyeSAmJiBlbnRyeS5oYXNDb25zdHJ1Y3RvcigpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbnN0cnVjdG9yID0gZW50cnkuZ2V0Q29uc3RydWN0b3IoKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IEFubm90YXRpb24uY3JlYXRlQW5ub3RhdGVkTm9kZUFycmF5KG5vZGUuYXJndW1lbnRzLCBjdHgpO1xuICAgICAgICAgICAgICAgIHZhciBleHRyYSA9IGNvbnN0cnVjdG9yLmV2YWx1YXRlKHJlc3VsdCwgYXJncywgY3R4KTtcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0RnJvbUV4dHJhKGV4dHJhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUmVmZXJlbmNlRXJyb3I6IFwiICsgbm9kZS5jYWxsZWUubmFtZSArIFwiIGlzIG5vdCBkZWZpbmVkXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIFVuYXJ5RXhwcmVzc2lvbjogZnVuY3Rpb24gKG5vZGUsIGN0eCkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUpLFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50ID0gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUuYXJndW1lbnQpLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yID0gbm9kZS5vcGVyYXRvcixcbiAgICAgICAgICAgICAgICBmdW5jID0gVW5hcnlGdW5jdGlvbnNbb3BlcmF0b3JdO1xuXG4gICAgICAgICAgICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBcIiFcIjpcblxuICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5CT09MRUFOKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcIitcIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwiLVwiOlxuICAgICAgICAgICAgICAgICAgICBpZiAoYXJndW1lbnQuY2FuSW50KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLklOVCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYXJndW1lbnQuY2FuTnVtYmVyKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLk5VTUJFUik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBldmFsdWF0ZSAnXCIgKyBvcGVyYXRvciArICdcIiBmb3IgJyArIGFyZ3VtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiflwiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCJ0eXBlb2ZcIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwidm9pZFwiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWxldGVcIjpcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPcGVyYXRvciBub3QgeWV0IHN1cHBvcnRlZDogXCIgKyBvcGVyYXRvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYXJndW1lbnQuaGFzU3RhdGljVmFsdWUoKSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRTdGF0aWNWYWx1ZShmdW5jKGFyZ3VtZW50LmdldFN0YXRpY1ZhbHVlKCkpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldER5bmFtaWNWYWx1ZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0sXG5cblxuICAgICAgICBJZGVudGlmaWVyOiBmdW5jdGlvbiAobm9kZSwgY3R4KSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obm9kZSksXG4gICAgICAgICAgICAgICAgbmFtZSA9IG5vZGUubmFtZTtcblxuICAgICAgICAgICAgaWYgKG5hbWUgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5VTkRFRklORUQpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuXG5cbiAgICAgICAgTG9naWNhbEV4cHJlc3Npb246IGZ1bmN0aW9uIChub2RlLCBjdHgpIHtcbiAgICAgICAgICAgIHZhciBsZWZ0ID0gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUubGVmdCksXG4gICAgICAgICAgICAgICAgcmlnaHQgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZS5yaWdodCksXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obm9kZSksXG4gICAgICAgICAgICAgICAgb3BlcmF0b3IgPSBub2RlLm9wZXJhdG9yO1xuXG4gICAgICAgICAgICBpZiAoIShvcGVyYXRvciA9PSBcIiYmXCIgfHwgb3BlcmF0b3IgPT0gXCJ8fFwiKSlcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPcGVyYXRvciBub3Qgc3VwcG9ydGVkOiBcIiArIG5vZGUub3BlcmF0b3IpO1xuXG4gICAgICAgICAgICBpZiAobGVmdC5pc051bGxPclVuZGVmaW5lZCgpKSB7ICAvLyBldmFsdWF0ZXMgdG8gZmFsc2VcbiAgICAgICAgICAgICAgICBpZiAob3BlcmF0b3IgPT0gXCJ8fFwiKSB7ICAgICAgLy8gZmFsc2UgfHwgeCA9IHhcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmNvcHkocmlnaHQpO1xuICAgICAgICAgICAgICAgICAgICBsZWZ0LmVsaW1pbmF0ZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7ICAgICAgICAgICAgICAgICAgICAgLy8gZmFsc2UgJiYgeCA9IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5jb3B5KGxlZnQpO1xuICAgICAgICAgICAgICAgICAgICByaWdodC5lbGltaW5hdGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxlZnQuaXNPYmplY3QoKSAmJiBvcGVyYXRvciA9PSBcInx8XCIpIHsgLy8gQW4gb2JqZWN0IHRoYXQgaXMgbm90IG51bGwgZXZhbHVhdGVzIHRvIHRydWVcbiAgICAgICAgICAgICAgICByZXN1bHQuY29weShsZWZ0KTtcbiAgICAgICAgICAgICAgICByaWdodC5lbGltaW5hdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGxlZnQuZ2V0VHlwZSgpID09IHJpZ2h0LmdldFR5cGUoKSkge1xuICAgICAgICAgICAgICAgIGlmIChsZWZ0LmlzT2JqZWN0KCkgJiYgbGVmdC5nZXRLaW5kKCkgIT0gcmlnaHQuZ2V0S2luZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGV2YWx1YXRlIGxvZ2ljYWwgZXhwcmVzc2lvbiB3aXRoIHR3byBkaWZmZXJlbnQga2luZCBvZiBvYmplY3RzXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHQuY29weShsZWZ0KTsgLy8gVE9ETzogU3RhdGljIHZhbHVlP1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gV2UgZG9uJ3QgYWxsb3cgZHluYW1pYyB0eXBlcyAodGhlIHR5cGUgb2YgdGhlIHJlc3VsdCBkZXBlbmRzIG9uIHRoZSB2YWx1ZSBvZiBpdCdzIG9wZXJhbmRzKS5cbiAgICAgICAgICAgICAgICAvLyBBdCB0aGlzIHBvaW50LCB0aGUgZXhwcmVzc2lvbiBuZWVkcyB0byBldmFsdWF0ZSB0byBhIHJlc3VsdCwgb3RoZXJ3aXNlIGl0J3MgYW4gZXJyb3JcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTdGF0aWMgZXZhbHVhdGlvbiBub3QgaW1wbGVtZW50ZWQgeWV0XCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG5cbiAgICAgICAgQmluYXJ5RXhwcmVzc2lvbjogZnVuY3Rpb24gKG5vZGUsIGN0eCkge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhub2RlLmxlZnQsIG5vZGUucmlnaHQpO1xuICAgICAgICAgICAgdmFyIGxlZnQgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZS5sZWZ0KSxcbiAgICAgICAgICAgICAgICByaWdodCA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLnJpZ2h0KSxcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihub2RlKSxcbiAgICAgICAgICAgICAgICBvcGVyYXRvciA9IG5vZGUub3BlcmF0b3IsXG4gICAgICAgICAgICAgICAgZnVuYyA9IEJpbmFyeUZ1bmN0aW9uc1tvcGVyYXRvcl07XG5cbiAgICAgICAgICAgIHN3aXRjaCAob3BlcmF0b3IpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwiK1wiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCItXCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcIipcIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwiL1wiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCIlXCI6XG4gICAgICAgICAgICAgICAgICAgIC8vIGludCAnb3AnIGludCA9PiBpbnRcbiAgICAgICAgICAgICAgICAgICAgLy8gaW50IC8gaW50ID0+IG51bWJlclxuICAgICAgICAgICAgICAgICAgICBpZiAobGVmdC5pc0ludCgpICYmIHJpZ2h0LmlzSW50KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcGVyYXRvciA9PSBcIi9cIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5OVU1CRVIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLklOVCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gaW50ICdvcCcgbnVtYmVyID0+IG51bWJlclxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChsZWZ0LmlzSW50KCkgJiYgcmlnaHQuaXNOdW1iZXIoKSB8fCByaWdodC5pc0ludCgpICYmIGxlZnQuaXNOdW1iZXIoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLk5VTUJFUik7XG4gICAgICAgICAgICAgICAgICAgIC8vIG51bWJlciAnb3AnIG51bWJlciA9PiBudW1iZXJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAobGVmdC5pc051bWJlcigpICYmIHJpZ2h0LmlzTnVtYmVyKCkpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5OVU1CRVIpO1xuICAgICAgICAgICAgICAgICAgICAvLyBpbnQgJ29wJyBudWxsID0+IGludFxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChsZWZ0LmlzSW50KCkgJiYgcmlnaHQuaXNOdWxsT3JVbmRlZmluZWQoKSB8fCByaWdodC5pc0ludCgpICYmIGxlZnQuaXNOdWxsT3JVbmRlZmluZWQoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuSU5UKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBudW1iZXIgJ29wJyBudWxsID0+IG51bWJlclxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICgobGVmdC5pc051bWJlcigpICYmIHJpZ2h0LmlzTnVsbE9yVW5kZWZpbmVkKCkpIHx8IChyaWdodC5pc051bWJlcigpICYmIGxlZnQuaXNOdWxsT3JVbmRlZmluZWQoKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLk5VTUJFUik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUuZXJyb3Iobm9kZSwgbGVmdC5nZXRUeXBlKCksIG9wZXJhdG9yLCByaWdodC5nZXRUeXBlKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIkV2YWx1YXRlcyB0byBOYU46IFwiICsgbGVmdC5nZXRUeXBlU3RyaW5nKCkgKyBcIiBcIiArIG9wZXJhdG9yICsgXCIgXCIgKyByaWdodC5nZXRUeXBlU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCI9PVwiOiAvLyBjb21wYXJpc29uXG4gICAgICAgICAgICAgICAgY2FzZSBcIiE9XCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcIj09PVwiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCIhPT1cIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwiPlwiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCI8XCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcIj49XCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcIjw9XCI6XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLkJPT0xFQU4pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPcGVyYXRvciBub3Qgc3VwcG9ydGVkOiBcIiArIG9wZXJhdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChsZWZ0Lmhhc1N0YXRpY1ZhbHVlKCkgJiYgcmlnaHQuaGFzU3RhdGljVmFsdWUoKSkge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobGVmdC5nZXRTdGF0aWNWYWx1ZSgpLCBvcGVyYXRvciwgcmlnaHQuZ2V0U3RhdGljVmFsdWUoKSk7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFN0YXRpY1ZhbHVlKGZ1bmMobGVmdC5nZXRTdGF0aWNWYWx1ZSgpLCByaWdodC5nZXRTdGF0aWNWYWx1ZSgpKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXREeW5hbWljVmFsdWUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9LFxuXG5cbiAgICAgICAgTWVtYmVyRXhwcmVzc2lvbjogZnVuY3Rpb24gKG5vZGUsIHBhcmVudCwgY3R4LCByb290KSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0VHlwZSA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlKSxcbiAgICAgICAgICAgICAgICBvYmplY3RBbm5vdGF0aW9uID0gbmV3IEFubm90YXRpb24obm9kZS5vYmplY3QpLFxuICAgICAgICAgICAgICAgIHByb3BlcnR5QW5ub3RhdGlvbiA9IG5ldyBBbm5vdGF0aW9uKG5vZGUucHJvcGVydHkpLFxuICAgICAgICAgICAgICAgIHByb3BlcnR5TmFtZSA9IG5vZGUucHJvcGVydHkubmFtZTtcblxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIk1lbWJlclwiLCBub2RlLm9iamVjdC5uYW1lLCBub2RlLnByb3BlcnR5Lm5hbWUpO1xuICAgICAgICAgICAgaWYgKG5vZGUuY29tcHV0ZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0QW5ub3RhdGlvbi5pc0FycmF5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUHJvcGVydHkgaXMgY29tcHV0ZWQsIHRodXMgaXQgY291bGQgYmUgYSB2YXJpYWJsZVxuICAgICAgICAgICAgICAgICAgICB2YXIgcHJvcGVydHlUeXBlID0gIGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLnByb3BlcnR5KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwcm9wZXJ0eVR5cGUuY2FuSW50KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJFeHBlY3RlZCAnaW50JyB0eXBlIGZvciBhcnJheSBhY2Nlc3NvclwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB2YXIgZWxlbWVudEluZm8gPSBvYmplY3RBbm5vdGF0aW9uLmdldEFycmF5RWxlbWVudFR5cGUoKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0VHlwZS5zZXRUeXBlKGVsZW1lbnRJbmZvLnR5cGUsIGVsZW1lbnRJbmZvLmtpbmQpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKG5vZGUsIFwiVHlwZUVycm9yOiBDYW5ub3QgcmVhZCBwcm9wZXJ0eSAnXCIrIHByb3BlcnR5TmFtZSArIFwiJyBvZiBcIiArIG9iamVjdEFubm90YXRpb24uZ2V0VHlwZVN0cmluZygpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBvYmplY3RPZkludGVyZXN0ID0gZ2V0T2JqZWN0UmVmZXJlbmNlRnJvbU5vZGUobm9kZS5vYmplY3QsIGN0eCk7XG5cbiAgICAgICAgICAgIG9iamVjdE9mSW50ZXJlc3QgfHwgU2hhZGUudGhyb3dFcnJvcihub2RlLFwiUmVmZXJlbmNlRXJyb3I6IFwiICsgbm9kZS5vYmplY3QubmFtZSArIFwiIGlzIG5vdCBkZWZpbmVkLiBDb250ZXh0OiBcIiArIGN0eC5zdHIoKSk7XG5cbiAgICAgICAgICAgIGlmIChvYmplY3RPZkludGVyZXN0LmdldFR5cGUoKSA9PSBUWVBFUy5VTkRFRklORUQpIHsgIC8vIGUuZy4gdmFyIGEgPSB1bmRlZmluZWQ7IGEudW5rbm93bjtcbiAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKG5vZGUsIFwiVHlwZUVycm9yOiBDYW5ub3QgcmVhZCBwcm9wZXJ0eSAnXCIrIHByb3BlcnR5TmFtZSArXCInIG9mIHVuZGVmaW5lZFwiKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9iamVjdE9mSW50ZXJlc3QuZ2V0VHlwZSgpICE9IFRZUEVTLk9CSkVDVCkgeyAvLyBlLmcuIHZhciBhID0gNTsgYS51bmtub3duO1xuICAgICAgICAgICAgICAgIHJlc3VsdFR5cGUuc2V0VHlwZShUWVBFUy5VTkRFRklORUQpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIG9iamVjdEluZm8gPSBjdHguZ2V0T2JqZWN0SW5mb0ZvcihvYmplY3RPZkludGVyZXN0KTtcbiAgICAgICAgICAgIGlmKCFvYmplY3RJbmZvKVxuICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJJbnRlcm5hbDogSW5jb21wbGV0ZSByZWdpc3RyYXRpb24gZm9yIG9iamVjdDogXCIgKyBvYmplY3RPZkludGVyZXN0LmdldFR5cGVTdHJpbmcoKSArIFwiLCBcIiArIEpTT04uc3RyaW5naWZ5KG5vZGUub2JqZWN0KSk7XG5cbiAgICAgICAgICAgIG9iamVjdEFubm90YXRpb24uY29weShvYmplY3RPZkludGVyZXN0KTtcbiAgICAgICAgICAgIGlmICghb2JqZWN0SW5mby5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0VHlwZS5zZXRUeXBlKFRZUEVTLlVOREVGSU5FRCk7XG4gICAgICAgICAgICAgICAgcHJvcGVydHlBbm5vdGF0aW9uLnNldFR5cGUoVFlQRVMuVU5ERUZJTkVEKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBwcm9wZXJ0eVR5cGVJbmZvID0gb2JqZWN0SW5mb1twcm9wZXJ0eU5hbWVdO1xuICAgICAgICAgICAgcHJvcGVydHlBbm5vdGF0aW9uLnNldEZyb21FeHRyYShwcm9wZXJ0eVR5cGVJbmZvKTtcbiAgICAgICAgICAgIHJlc3VsdFR5cGUuc2V0RnJvbUV4dHJhKHByb3BlcnR5VHlwZUluZm8pO1xuICAgICAgICB9LFxuXG4gICAgICAgIENhbGxFeHByZXNzaW9uOiBmdW5jdGlvbiAobm9kZSwgY3R4LCByb290KSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obm9kZSk7XG5cbiAgICAgICAgICAgIC8vIENhbGwgb24gYW4gb2JqZWN0LCBlLmcuIE1hdGguY29zKClcbiAgICAgICAgICAgIGlmIChub2RlLmNhbGxlZS50eXBlID09IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNhbGxpbmdPYmplY3QgPSBnZXRPYmplY3RSZWZlcmVuY2VGcm9tTm9kZShub2RlLmNhbGxlZSwgY3R4KTtcblxuICAgICAgICAgICAgICAgIGlmICghY2FsbGluZ09iamVjdC5pc0Z1bmN0aW9uKCkpIHsgLy8gZS5nLiBNYXRoLlBJKClcbiAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIlR5cGVFcnJvcjogT2JqZWN0ICM8XCIgKyBjYWxsaW5nT2JqZWN0LmdldFR5cGUoKSsgXCI+IGhhcyBubyBtZXRob2QgJ1wiKyBub2RlLmNhbGxlZS5wcm9wZXJ0eS5uYW1lICsgXCInXCIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBvYmplY3QgPSBub2RlLmNhbGxlZS5vYmplY3QsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5TmFtZSA9IG5vZGUuY2FsbGVlLnByb3BlcnR5Lm5hbWU7XG5cbiAgICAgICAgICAgICAgICB2YXIgb2JqZWN0UmVmZXJlbmNlID0gZ2V0T2JqZWN0UmVmZXJlbmNlRnJvbU5vZGUob2JqZWN0LCBjdHgpO1xuICAgICAgICAgICAgICAgIGlmKCFvYmplY3RSZWZlcmVuY2UpICB7XG4gICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJJbnRlcm5hbDogTm8gb2JqZWN0IGluZm8gZm9yOiBcIiArIG9iamVjdCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIG9iamVjdEluZm8gPSBjdHguZ2V0T2JqZWN0SW5mb0ZvcihvYmplY3RSZWZlcmVuY2UpO1xuICAgICAgICAgICAgICAgIGlmKCFvYmplY3RJbmZvKSB7IC8vIEV2ZXJ5IG9iamVjdCBuZWVkcyBhbiBpbmZvLCBvdGhlcndpc2Ugd2UgZGlkIHNvbWV0aGluZyB3cm9uZ1xuICAgICAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKG5vZGUsIFwiSW50ZXJuYWwgRXJyb3I6IE5vIG9iamVjdCByZWdpc3RlcmVkIGZvcjogXCIgKyBvYmplY3RSZWZlcmVuY2UuZ2V0VHlwZVN0cmluZygpICsgSlNPTi5zdHJpbmdpZnkobm9kZS5vYmplY3QpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdEluZm8uaGFzT3duUHJvcGVydHkocHJvcGVydHlOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcHJvcGVydHlIYW5kbGVyID0gb2JqZWN0SW5mb1twcm9wZXJ0eU5hbWVdO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHByb3BlcnR5SGFuZGxlci5ldmFsdWF0ZSA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQW5ub3RhdGlvbi5jcmVhdGVBbm5vdGF0ZWROb2RlQXJyYXkobm9kZS5hcmd1bWVudHMsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZXh0cmEgPSBwcm9wZXJ0eUhhbmRsZXIuZXZhbHVhdGUocmVzdWx0LCBhcmdzLCBjdHgsIG9iamVjdFJlZmVyZW5jZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0RnJvbUV4dHJhKGV4dHJhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gIGVsc2UgaWYgKG5vZGUuY2FsbGVlLnR5cGUgPT0gU3ludGF4LklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZnVuY3Rpb25OYW1lID0gbm9kZS5jYWxsZWUubmFtZTtcbiAgICAgICAgICAgICAgICB2YXIgZnVuYyA9IGN0eC5nZXRCaW5kaW5nQnlOYW1lKGZ1bmN0aW9uTmFtZSk7XG4gICAgICAgICAgICAgICAgaWYgKCFmdW5jKSB7XG4gICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJSZWZlcmVuY2VFcnJvcjogXCIgKyBmdW5jdGlvbk5hbWUgKyBcIiBpcyBub3QgZGVmaW5lZFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYoIWZ1bmMuaXNGdW5jdGlvbigpKSB7XG4gICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJUeXBlRXJyb3I6IFwiICsgZnVuYy5nZXRUeXBlU3RyaW5nKCkgKyBcIiBpcyBub3QgYSBmdW5jdGlvblwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBbm5vdGF0aW9uLmNyZWF0ZUFubm90YXRlZE5vZGVBcnJheShub2RlLmFyZ3VtZW50cywgY3R4KTtcbiAgICAgICAgICAgICAgICB2YXIgZGVmaW5pbmdDb250ZXh0ID0gY3R4LmdldENvbnRleHRGb3JOYW1lKGZ1bmN0aW9uTmFtZSk7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB2YXIgZXh0cmEgPSByb290LmdldEZ1bmN0aW9uSW5mb3JtYXRpb25Gb3IoY3R4LmdldFZhcmlhYmxlSWRlbnRpZmllcihmdW5jdGlvbk5hbWUpLCBhcmdzLCBkZWZpbmluZ0NvbnRleHQpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKG5vZGUsIFwiRmFpbHVyZSBpbiBmdW5jdGlvbiBjYWxsOiBcIiArIGUubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGV4dHJhICYmIHJlc3VsdC5zZXRGcm9tRXh0cmEoZXh0cmEpO1xuICAgICAgICAgICAgICAgIG5vZGUuY2FsbGVlLm5hbWUgPSBleHRyYS5uZXdOYW1lO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8qY2FzZSBTeW50YXguSWRlbnRpZmllcjpcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZ1bmN0aW9uTmFtZSA9IG5vZGUuY2FsbGVlLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmdW5jID0gY3R4LmdldEJpbmRpbmdCeU5hbWUoZnVuY3Rpb25OYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEoZnVuYyAmJiBmdW5jLmlzSW5pdGlhbGl6ZWQoKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihmdW5jdGlvbk5hbWUgKyBcIiBpcyBub3QgZGVmaW5lZC4gQ29udGV4dDogXCIgKyBjdHguc3RyKCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGZ1bmMpO1xuICAgICAgICAgICAgICAgICAgICAvL3Rocm93IG5ldyBFcnJvcihcIkNhbid0IGNhbGwgXCIgKyBmdW5jdGlvbk5hbWUgKyBcIigpIGluIHRoaXMgY29udGV4dDogXCIgKyBjdHguc3RyKCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiAgICovXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmhhbmRsZWQgQ2FsbEV4cHJlc3Npb246XCIgKyBub2RlLmNhbGxlZS50eXBlKTtcblxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBlbnRlckV4cHJlc3Npb24gPSBmdW5jdGlvbiAobm9kZSwgcGFyZW50LCBjdHgpIHtcbiAgICAgICAgaWYgKGVudGVySGFuZGxlcnMuaGFzT3duUHJvcGVydHkobm9kZS50eXBlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGVudGVySGFuZGxlcnNbbm9kZS50eXBlXShub2RlLCBwYXJlbnQsIGN0eCwgdGhpcyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGV4aXRFeHByZXNzaW9uID0gZnVuY3Rpb24gKG5vZGUsIHBhcmVudCwgY3R4KSB7XG5cbiAgICAgICAgc3dpdGNoIChub2RlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkFzc2lnbm1lbnRFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLkFzc2lnbm1lbnRFeHByZXNzaW9uKG5vZGUsIGN0eCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5BcnJheUV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkFycmF5UGF0dGVybjpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguQmluYXJ5RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBoYW5kbGVycy5CaW5hcnlFeHByZXNzaW9uKG5vZGUsIGN0eCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5DYWxsRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBoYW5kbGVycy5DYWxsRXhwcmVzc2lvbihub2RlLCBjdHgsIHRoaXMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguQ29uZGl0aW9uYWxFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguRnVuY3Rpb25FeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5JZGVudGlmaWVyOlxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLklkZW50aWZpZXIobm9kZSwgY3R4KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkxpdGVyYWw6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Mb2dpY2FsRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBoYW5kbGVycy5Mb2dpY2FsRXhwcmVzc2lvbihub2RlLCBjdHgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguTWVtYmVyRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBoYW5kbGVycy5NZW1iZXJFeHByZXNzaW9uKG5vZGUsIHBhcmVudCwgY3R4LCB0aGlzKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk5ld0V4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgaGFuZGxlcnMuTmV3RXhwcmVzc2lvbihub2RlLCBwYXJlbnQsIGN0eCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5PYmplY3RFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5PYmplY3RQYXR0ZXJuOlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Qcm9wZXJ0eTpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguU2VxdWVuY2VFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5UaGlzRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlVuYXJ5RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBoYW5kbGVycy5VbmFyeUV4cHJlc3Npb24obm9kZSwgY3R4KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlVwZGF0ZUV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LllpZWxkRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gbm9kZSB0eXBlOiAnICsgbm9kZS50eXBlKTtcblxuXG4gICAgICAgIH1cblxuICAgIH07XG5cblxuICAgIG5zLmVudGVyRXhwcmVzc2lvbiA9IGVudGVyRXhwcmVzc2lvbjtcbiAgICBucy5leGl0RXhwcmVzc2lvbiA9IGV4aXRFeHByZXNzaW9uO1xufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24gKG5zKSB7XG5cbiAgICB2YXIgd2FsayA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKSxcbiAgICAgICAgZW50ZXJFeHByZXNzaW9uID0gcmVxdWlyZSgnLi9pbmZlcl9leHByZXNzaW9uLmpzJykuZW50ZXJFeHByZXNzaW9uLFxuICAgICAgICBleGl0RXhwcmVzc2lvbiA9IHJlcXVpcmUoJy4vaW5mZXJfZXhwcmVzc2lvbi5qcycpLmV4aXRFeHByZXNzaW9uLFxuICAgICAgICBTeW50YXggPSByZXF1aXJlKCdlc3RyYXZlcnNlJykuU3ludGF4LFxuICAgICAgICBUWVBFUyA9IHJlcXVpcmUoXCIuLi8uLi9pbnRlcmZhY2VzLmpzXCIpLlRZUEVTLFxuICAgICAgICBBbm5vdGF0aW9uID0gcmVxdWlyZShcIi4vLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkFubm90YXRpb24sXG4gICAgICAgIEZ1bmN0aW9uQW5ub3RhdGlvbiA9IHJlcXVpcmUoXCIuLy4uLy4uL2Jhc2UvYW5ub3RhdGlvbi5qc1wiKS5GdW5jdGlvbkFubm90YXRpb247XG5cbiAgICB2YXIgbG9nID0gZnVuY3Rpb24oc3RyKSB7fTtcbiAgICAvL3ZhciBsb2cgPSBmdW5jdGlvbigpIHsgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTsgfTtcblxuICAgIHZhciBlbnRlckhhbmRsZXIgPSB7XG4gICAgICAgIEZvclN0YXRlbWVudDogZnVuY3Rpb24obm9kZSwgY3R4LCByb290KSB7XG4gICAgICAgICAgICB2YXIgY3R4ID0gcm9vdC5jcmVhdGVDb250ZXh0KG5vZGUsIGN0eCk7XG4gICAgICAgICAgICByb290LnB1c2hDb250ZXh0KGN0eCk7XG5cbiAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS5pbml0KTtcbiAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS50ZXN0KTtcblxuICAgICAgICAgICAgdmFyIHRlc3QgPSBuZXcgQW5ub3RhdGlvbihub2RlLnRlc3QpO1xuICAgICAgICAgICAgaWYgKHRlc3QuaGFzU3RhdGljVmFsdWUoKSkgeyAvLyBHcmVhdCEgV2UgY2FuIGV2YWx1YXRlIGl0IVxuICAgICAgICAgICAgICAgIC8vIFRPRE9cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcm9vdC50cmF2ZXJzZShub2RlLnVwZGF0ZSk7XG4gICAgICAgICAgICByb290LnRyYXZlcnNlKG5vZGUuYm9keSk7XG4gICAgICAgICAgICByb290LnBvcENvbnRleHQoKTtcbiAgICAgICAgICAgIHJldHVybiB3YWxrLlZpc2l0b3JPcHRpb24uU2tpcDtcbiAgICAgICAgfSxcblxuICAgICAgICBJZlN0YXRlbWVudDogKGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICB2YXIgY19ldmFsdWF0ZSA9IGZ1bmN0aW9uKGV4cCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhIWV4cDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKG5vZGUsIGN0eCwgcm9vdCkge1xuICAgICAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS50ZXN0KTtcbiAgICAgICAgICAgICAgICB2YXIgdGVzdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUudGVzdCk7XG4gICAgICAgICAgICAgICAgaWYgKHRlc3QuaGFzU3RhdGljVmFsdWUoKSkgeyAvLyBHcmVhdCEgV2UgY2FuIGV2YWx1YXRlIGl0IVxuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiU3RhdGljIHZhbHVlIGluIGlmIHRlc3QhXCIpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGVzdFJlc3VsdCA9IGNfZXZhbHVhdGUodGVzdC5nZXRTdGF0aWNWYWx1ZSgpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoIXRlc3RSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmFsdGVybmF0ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb290LnRyYXZlcnNlKG5vZGUuYWx0ZXJuYXRlKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnNlcXVlbnQgPSBuZXcgQW5ub3RhdGlvbihub2RlLmNvbnNlcXVlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc2VxdWVudC5lbGltaW5hdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS5jb25zZXF1ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKG5vZGUuYWx0ZXJuYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFsdGVybmF0ZSA9IG5ldyBBbm5vdGF0aW9uKG5vZGUuYWx0ZXJuYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbHRlcm5hdGUuZWxpbWluYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHdhbGsuVmlzaXRvck9wdGlvbi5Ta2lwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSgpKSxcblxuICAgICAgICBWYXJpYWJsZURlY2xhcmF0aW9uOiBmdW5jdGlvbihub2RlLCBjdHgpIHtcbiAgICAgICAgICAgIGN0eC5pbkRlY2xhcmF0aW9uID0gdHJ1ZTtcbiAgICAgICAgfSxcblxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbm9kZVxuICAgICAgICAgKiBAcGFyYW0ge0NvbnRleHR9IHBhcmVudENvbnRleHRcbiAgICAgICAgICogQHBhcmFtIHtUeXBlSW5mZXJlbmNlfSByb290XG4gICAgICAgICAqL1xuICAgICAgICBGdW5jdGlvbkRlY2xhcmF0aW9uOiBmdW5jdGlvbihub2RlLCBwYXJlbnRDb250ZXh0LCByb290KSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEZ1bmN0aW9uQW5ub3RhdGlvbihub2RlKTtcblxuICAgICAgICAgICAgaWYgKG5vZGUuaWQudHlwZSAhPSBTeW50YXguSWRlbnRpZmllcikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkR5bmFtaWMgdmFyaWFibGUgbmFtZXMgYXJlIG5vdCB5ZXQgc3VwcG9ydGVkXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGZ1bmN0aW9uTmFtZSA9IG5vZGUuaWQubmFtZTtcbiAgICAgICAgICAgIHZhciBmdW5jdGlvbkNvbnRleHQgPSByb290LmNyZWF0ZUNvbnRleHQobm9kZSwgcGFyZW50Q29udGV4dCwgZnVuY3Rpb25OYW1lKTtcbiAgICAgICAgICAgIGZ1bmN0aW9uQ29udGV4dC5kZWNsYXJlUGFyYW1ldGVycyhub2RlLnBhcmFtcyk7XG4gICAgICAgICAgICByb290LnB1c2hDb250ZXh0KGZ1bmN0aW9uQ29udGV4dCk7XG4gICAgICAgICAgICBpZihmdW5jdGlvbkNvbnRleHQuc3RyKCkgIT0gcm9vdC5lbnRyeVBvaW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdhbGsuVmlzaXRvck9wdGlvbi5Ta2lwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGV4aXRIYW5kbGVyID0ge1xuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIG5vZGVcbiAgICAgICAgICogQHBhcmFtIHtDb250ZXh0fSBjdHhcbiAgICAgICAgICogQHBhcmFtIHtUeXBlSW5mZXJlbmNlfSByb290XG4gICAgICAgICAqL1xuICAgICAgICBGdW5jdGlvbkRlY2xhcmF0aW9uOiBmdW5jdGlvbihub2RlLCBjdHgsIHJvb3QpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgRnVuY3Rpb25Bbm5vdGF0aW9uKG5vZGUpO1xuICAgICAgICAgICAgdmFyIHJldHVybkluZm8gPSBjdHguZ2V0UmV0dXJuSW5mbygpO1xuICAgICAgICAgICAgcmVzdWx0LnNldFJldHVybkluZm8ocmV0dXJuSW5mbyB8fCB7IHR5cGU6IFRZUEVTLlVOREVGSU5FRCB9KTtcbiAgICAgICAgICAgIHJvb3QucG9wQ29udGV4dCgpO1xuICAgICAgICB9LFxuICAgICAgICBWYXJpYWJsZURlY2xhcmF0aW9uOiBmdW5jdGlvbihub2RlLCBjdHgpIHtcbiAgICAgICAgICAgIGN0eC5pbkRlY2xhcmF0aW9uID0gZmFsc2U7XG4gICAgICAgIH0sXG4gICAgICAgIFZhcmlhYmxlRGVjbGFyYXRvcjogZnVuY3Rpb24obm9kZSwgY3R4KSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obm9kZSk7XG5cbiAgICAgICAgICAgIGlmIChub2RlLmlkLnR5cGUgIT0gU3ludGF4LklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEeW5hbWljIHZhcmlhYmxlIG5hbWVzIGFyZSBub3QgeWV0IHN1cHBvcnRlZFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciB2YXJpYWJsZU5hbWUgPSBub2RlLmlkLm5hbWU7XG4gICAgICAgICAgICBjdHguZGVjbGFyZVZhcmlhYmxlKHZhcmlhYmxlTmFtZSwgdHJ1ZSwgcmVzdWx0KTtcblxuICAgICAgICAgICAgaWYgKG5vZGUuaW5pdCkge1xuICAgICAgICAgICAgICAgIHZhciBpbml0ID0gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUuaW5pdCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmNvcHkoaW5pdCk7XG4gICAgICAgICAgICAgICAgY3R4LnVwZGF0ZUV4cHJlc3Npb24odmFyaWFibGVOYW1lLCBpbml0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuVU5ERUZJTkVEKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFRPRE86IHJlc3VsdC5zZXRUeXBlKGluaXQuZ2V0VHlwZSgpKTtcbiAgICAgICAgfSxcbiAgICAgICAgUmV0dXJuU3RhdGVtZW50OiBmdW5jdGlvbihub2RlLCBwYXJlbnQsIGN0eCkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUpLFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50ID0gbm9kZS5hcmd1bWVudCA/IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLmFyZ3VtZW50KSA6IG51bGw7XG5cbiAgICAgICAgICAgIGlmIChhcmd1bWVudCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5jb3B5KGFyZ3VtZW50KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuVU5ERUZJTkVEKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGN0eC51cGRhdGVSZXR1cm5JbmZvKHJlc3VsdCk7XG4gICAgICAgIH1cblxuICAgIH1cblxuXG5cblxuICAgIHZhciBlbnRlclN0YXRlbWVudCA9IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQsIGN0eCkge1xuICAgICAgICBzd2l0Y2ggKG5vZGUudHlwZSkge1xuICAgICAgICAgICAgY2FzZSBTeW50YXguRm9yU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIHJldHVybiBlbnRlckhhbmRsZXIuRm9yU3RhdGVtZW50KG5vZGUsIGN0eCwgdGhpcyk7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5JZlN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICByZXR1cm4gZW50ZXJIYW5kbGVyLklmU3RhdGVtZW50KG5vZGUsIGN0eCwgdGhpcyk7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5WYXJpYWJsZURlY2xhcmF0aW9uOlxuICAgICAgICAgICAgICAgIHJldHVybiBlbnRlckhhbmRsZXIuVmFyaWFibGVEZWNsYXJhdGlvbihub2RlLCBjdHgpO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbjpcbiAgICAgICAgICAgICAgICByZXR1cm4gZW50ZXJIYW5kbGVyLkZ1bmN0aW9uRGVjbGFyYXRpb24obm9kZSwgY3R4LCB0aGlzKTtcblxuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcblxuXG4gICAgfTtcblxuICAgIHZhciBleGl0U3RhdGVtZW50ID0gZnVuY3Rpb24gKG5vZGUsIHBhcmVudCwgY3R4KSB7XG5cbiAgICAgICAgc3dpdGNoIChub2RlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkV4cHJlc3Npb25TdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUpLFxuICAgICAgICAgICAgICAgICAgICBleHByZXNzaW9uID0gbmV3IEFubm90YXRpb24obm9kZS5leHByZXNzaW9uKTtcblxuICAgICAgICAgICAgICAgIHJlc3VsdC5jb3B5KGV4cHJlc3Npb24pO1xuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5CbG9ja1N0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguQnJlYWtTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkNhdGNoQ2xhdXNlOlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Db250aW51ZVN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguRGlyZWN0aXZlU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Eb1doaWxlU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5EZWJ1Z2dlclN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguRW1wdHlTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkZvclN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguRm9ySW5TdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb246XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4aXRIYW5kbGVyLkZ1bmN0aW9uRGVjbGFyYXRpb24obm9kZSwgY3R4LCB0aGlzKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LklmU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguTGFiZWxlZFN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguUHJvZ3JhbTpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlJldHVyblN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICByZXR1cm4gZXhpdEhhbmRsZXIuUmV0dXJuU3RhdGVtZW50KG5vZGUsIHBhcmVudCwgY3R4KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlN3aXRjaFN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguU3dpdGNoQ2FzZTpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguVGhyb3dTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlRyeVN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguVmFyaWFibGVEZWNsYXJhdGlvbjpcbiAgICAgICAgICAgICAgICByZXR1cm4gZXhpdEhhbmRsZXIuVmFyaWFibGVEZWNsYXJhdGlvbihub2RlLCBjdHgpO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguVmFyaWFibGVEZWNsYXJhdG9yOlxuICAgICAgICAgICAgICAgIGV4aXRIYW5kbGVyLlZhcmlhYmxlRGVjbGFyYXRvcihub2RlLCBjdHgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguV2hpbGVTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LldpdGhTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIG5vZGUgdHlwZTogJyArIG5vZGUudHlwZSk7XG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBucy5lbnRlclN0YXRlbWVudCA9IGVudGVyU3RhdGVtZW50O1xuICAgIG5zLmV4aXRTdGF0ZW1lbnQgPSBleGl0U3RhdGVtZW50O1xufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIiksXG4gICAgICAgIFRZUEVTID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxuICAgICAgICBUb29scyA9IHJlcXVpcmUoXCIuL3Rvb2xzLmpzXCIpO1xuXG4gICAgdmFyIENvbG9yQ2xvc3VyZUluc3RhbmNlID0ge1xuICAgICAgICBtdWx0aXBseToge1xuICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxuICAgICAgICAgICAgICAgICAgICBraW5kOiBLSU5EUy5DT0xPUl9DTE9TVVJFXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgYWRkOiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcbiAgICAgICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5PQkpFQ1QsXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IEtJTkRTLkNPTE9SX0NMT1NVUkVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIFRvb2xzLmV4dGVuZChucywge1xuICAgICAgICBpZDogXCJDb2xvckNsb3N1cmVcIixcbiAgICAgICAga2luZDogS0lORFMuQ09MT1JfQ0xPU1VSRSxcbiAgICAgICAgb2JqZWN0OiBudWxsLFxuICAgICAgICBpbnN0YW5jZTogQ29sb3JDbG9zdXJlSW5zdGFuY2VcbiAgICB9KTtcblxuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbiAobnMpIHtcblxuICAgIHZhciBvYmplY3RzID0ge1xuICAgICAgICBTaGFkZSA6IHJlcXVpcmUoXCIuL3NoYWRlLmpzXCIpLFxuICAgICAgICBNYXRyaXg0IDogcmVxdWlyZShcIi4vbWF0cml4LmpzXCIpLFxuICAgICAgICBNYXRoIDogcmVxdWlyZShcIi4vbWF0aC5qc1wiKSxcbiAgICAgICAgVmVjMiA6IHJlcXVpcmUoXCIuL3ZlYzIuanNcIiksXG4gICAgICAgIFZlYzMgOiByZXF1aXJlKFwiLi92ZWMzLmpzXCIpLFxuICAgICAgICBDb2xvcjogcmVxdWlyZShcIi4vdmVjMy5qc1wiKSxcbiAgICAgICAgVmVjNCA6IHJlcXVpcmUoXCIuL3ZlYzQuanNcIiksXG4gICAgICAgIFN5c3RlbTogcmVxdWlyZShcIi4vc3lzdGVtLmpzXCIpLFxuICAgICAgICBDb2xvckNsb3N1cmU6IHJlcXVpcmUoXCIuL2NvbG9yY2xvc3VyZS5qc1wiKVxuICAgIH07XG5cbiAgICBleHBvcnRzLlJlZ2lzdHJ5ID0ge1xuICAgICAgICBuYW1lOiBcIlR5cGVJbmZlcmVuY2VcIixcbiAgICAgICAgZ2V0QnlOYW1lOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gb2JqZWN0c1tuYW1lXTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgbnVsbDtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0SW5zdGFuY2VGb3JLaW5kOiBmdW5jdGlvbihraW5kKSB7XG4gICAgICAgICAgICBmb3IodmFyIG9iaiBpbiBvYmplY3RzKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdHNbb2JqXS5raW5kID09IGtpbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdHNbb2JqXS5pbnN0YW5jZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24gKG5zKSB7XG5cbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgVFlQRVMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgQmFzZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9iYXNlL2luZGV4LmpzXCIpLFxuICAgICAgICBUb29scyA9IHJlcXVpcmUoXCIuL3Rvb2xzLmpzXCIpO1xuXG5cbiAgICB2YXIgZXZhbHVhdGVNZXRob2QgPSBmdW5jdGlvbiAobmFtZSwgcGFyYW1Db3VudCwgcmV0dXJuVHlwZSkge1xuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtBbm5vdGF0aW9ufSByZXN1bHRcbiAgICAgICAgICogQHBhcmFtIHtBcnJheS48QW5ub3RhdGlvbj59IGFyZ3NcbiAgICAgICAgICogQHBhcmFtIHtDb250ZXh0fSBjdHhcbiAgICAgICAgICovXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAocmVzdWx0LCBhcmdzLCBjdHgpIHtcbiAgICAgICAgICAgIGlmIChwYXJhbUNvdW50ICE9IC0xKSB7IC8vIEFyYml0cmFyeSBudW1iZXIgb2YgYXJndW1lbnRzXG4gICAgICAgICAgICAgICAgaWYgKCFhcmdzIHx8IGFyZ3MubGVuZ3RoICE9IHBhcmFtQ291bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBudW1iZXIgb2YgcGFyYW1ldGVycyBmb3IgTWF0aC5cIiArIG5hbWUgKyBcIiwgZXhwZWN0ZWQgXCIgKyBwYXJhbUNvdW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBhcmdBcnJheSA9IFtdO1xuICAgICAgICAgICAgdmFyIGlzU3RhdGljID0gdHJ1ZTtcbiAgICAgICAgICAgIGFyZ3MuZm9yRWFjaChmdW5jdGlvbiAocGFyYW0sIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgaWYgKCFwYXJhbS5jYW5OdW1iZXIoKSlcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUGFyYW1ldGVyIFwiICsgaW5kZXggKyBcIiBoYXMgaW52YWxpZCB0eXBlIGZvciBNYXRoLlwiICsgbmFtZSArIFwiLCBleHBlY3RlZCAnbnVtYmVyJywgYnV0IGdvdCBcIiArIHBhcmFtLmdldFR5cGUoKSk7XG4gICAgICAgICAgICAgICAgaXNTdGF0aWMgPSBpc1N0YXRpYyAmJiBwYXJhbS5oYXNTdGF0aWNWYWx1ZSgpO1xuICAgICAgICAgICAgICAgIGlmIChpc1N0YXRpYylcbiAgICAgICAgICAgICAgICAgICAgYXJnQXJyYXkucHVzaChwYXJhbS5nZXRTdGF0aWNWYWx1ZSgpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIHR5cGVJbmZvID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IHJldHVyblR5cGUgfHwgVFlQRVMuTlVNQkVSXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaXNTdGF0aWMpIHtcbiAgICAgICAgICAgICAgICB0eXBlSW5mby5zdGF0aWNWYWx1ZSA9IE1hdGhbbmFtZV0uYXBwbHkodW5kZWZpbmVkLCBhcmdBcnJheSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHlwZUluZm87XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgTWF0aE9iamVjdCA9IHtcbiAgICAgICAgcmFuZG9tOiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcbiAgICAgICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbihub2RlLCBhcmdzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNYXRoLnJhbmRvbSBoYXMgbm8gcGFyYW1ldGVycy5cIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuTlVNQkVSXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBhYnM6IHtcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxuICAgICAgICAgICAgZXZhbHVhdGU6IGZ1bmN0aW9uKHJlc3VsdCwgYXJncykge1xuICAgICAgICAgICAgICAgIFRvb2xzLmNoZWNrUGFyYW1Db3VudChyZXN1bHQubm9kZSwgXCJNYXRoLmFic1wiLCBbMV0sIGFyZ3MubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB2YXIgdHlwZUluZm8gPSB7fTtcbiAgICAgICAgICAgICAgICBzd2l0Y2goYXJnc1swXS5nZXRUeXBlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBUWVBFUy5OVU1CRVI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgVFlQRVMuSU5UOlxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZUluZm8udHlwZSA9IGFyZ3NbMF0uZ2V0VHlwZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKHJlc3VsdC5ub2RlLCBcIkludmFsaWRUeXBlIGZvciBNYXRoLmFic1wiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVJbmZvO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBNYXRoQ29uc3RhbnRzID0gW1wiRVwiLCBcIlBJXCIsIFwiTE4yXCIsIFwiTE9HMkVcIiwgXCJMT0cxMEVcIiwgXCJQSVwiLCBcIlNRUlQxXzJcIiwgXCJTUVJUMlwiXTtcbiAgICB2YXIgT25lUGFyYW1ldGVyTnVtYmVyTWV0aG9kcyA9IFtcImFjb3NcIiwgXCJhc2luXCIsIFwiYXRhblwiLCBcImNvc1wiLCBcImV4cFwiLCBcImxvZ1wiLCBcInJvdW5kXCIsIFwic2luXCIsIFwic3FydFwiLCBcInRhblwiXTtcbiAgICB2YXIgT25lUGFyYW1ldGVySW50TWV0aG9kcyA9IFtcImNlaWxcIiwgXCJmbG9vclwiXTtcbiAgICB2YXIgVHdvUGFyYW1ldGVyTnVtYmVyTWV0aG9kcyA9IFtcImF0YW4yXCIsIFwicG93XCJdO1xuICAgIHZhciBBcmJpdHJhcnlQYXJhbWV0ZXJOdW1iZXJNZXRob2RzID0gW1wibWF4XCIsIFwibWluXCJdO1xuXG4gICAgTWF0aENvbnN0YW50cy5mb3JFYWNoKGZ1bmN0aW9uIChjb25zdGFudCkge1xuICAgICAgICBNYXRoT2JqZWN0W2NvbnN0YW50XSA9IHsgdHlwZTogVFlQRVMuTlVNQkVSLCBzdGF0aWNWYWx1ZTogTWF0aFtjb25zdGFudF0gfTtcbiAgICB9KTtcblxuICAgIE9uZVBhcmFtZXRlck51bWJlck1ldGhvZHMuZm9yRWFjaChmdW5jdGlvbiAobWV0aG9kKSB7XG4gICAgICAgIE1hdGhPYmplY3RbbWV0aG9kXSA9IHsgdHlwZTogVFlQRVMuRlVOQ1RJT04sIGV2YWx1YXRlOiBldmFsdWF0ZU1ldGhvZChtZXRob2QsIDEpIH07XG4gICAgfSk7XG5cbiAgICBUd29QYXJhbWV0ZXJOdW1iZXJNZXRob2RzLmZvckVhY2goZnVuY3Rpb24gKG1ldGhvZCkge1xuICAgICAgICBNYXRoT2JqZWN0W21ldGhvZF0gPSB7IHR5cGU6IFRZUEVTLkZVTkNUSU9OLCBldmFsdWF0ZTogZXZhbHVhdGVNZXRob2QobWV0aG9kLCAyKSB9O1xuICAgIH0pO1xuXG4gICAgT25lUGFyYW1ldGVySW50TWV0aG9kcy5mb3JFYWNoKGZ1bmN0aW9uIChtZXRob2QpIHtcbiAgICAgICAgTWF0aE9iamVjdFttZXRob2RdID0geyB0eXBlOiBUWVBFUy5GVU5DVElPTiwgZXZhbHVhdGU6IGV2YWx1YXRlTWV0aG9kKG1ldGhvZCwgMSwgVFlQRVMuSU5UKSB9O1xuICAgIH0pO1xuXG4gICAgQXJiaXRyYXJ5UGFyYW1ldGVyTnVtYmVyTWV0aG9kcy5mb3JFYWNoKGZ1bmN0aW9uIChtZXRob2QpIHtcbiAgICAgICAgTWF0aE9iamVjdFttZXRob2RdID0geyB0eXBlOiBUWVBFUy5GVU5DVElPTiwgZXZhbHVhdGU6IGV2YWx1YXRlTWV0aG9kKG1ldGhvZCwgLTEpIH07XG4gICAgfSk7XG5cbiAgICBCYXNlLmV4dGVuZChucywge1xuICAgICAgICBpZDogXCJNYXRoXCIsXG4gICAgICAgIG9iamVjdDoge1xuICAgICAgICAgICAgY29uc3RydWN0b3I6IG51bGwsXG4gICAgICAgICAgICBzdGF0aWM6IE1hdGhPYmplY3RcbiAgICAgICAgfSxcbiAgICAgICAgaW5zdGFuY2U6IE1hdGhPYmplY3RcbiAgICB9KTtcblxuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbiAobnMpIHtcblxuICAgIHZhciBpbnRlcmZhY2VzID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIiksXG4gICAgVG9vbHMgPSByZXF1aXJlKFwiLi90b29scy5qc1wiKTtcblxuICAgIHZhciBUWVBFUyA9IGludGVyZmFjZXMuVFlQRVMsXG4gICAgICAgIEtJTkRTID0gaW50ZXJmYWNlcy5PQkpFQ1RfS0lORFM7XG5cbiAgICB2YXIgTWF0cml4SW5zdGFuY2UgPSB7XG4gICAgICAgIHRyYW5zZm9ybVBvaW50OiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5VTkRFRklORUQsXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24ocmVzdWx0LCBhcmdzKSB7XG4gICAgICAgICAgICAgICAgVG9vbHMuY2hlY2tQYXJhbUNvdW50KHJlc3VsdC5ub2RlLCBcIk1hdHJpeDo6dHJhbnNmb3JtUG9pbnRcIiwgWzEsMl0sIGFyZ3MubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB2YXIgc291cmNlUG9pbnQgPSB0YXJnZXRQb2ludCA9IGFyZ3NbMF07XG4gICAgICAgICAgICAgICAgaWYgKCEoc291cmNlUG9pbnQuaXNPYmplY3QoKSAmJiBzb3VyY2VQb2ludC5jYW5Ob3JtYWwoKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmlyc3QgYXJndW1lbnQgb2YgTWF0cml4Ojp0cmFuc2Zvcm1Qb2ludCBtdXN0IGV2YWx1YXRlIHRvIGEgcG9pbnQsIGZvdW5kOiBcIiArIHNvdXJjZVBvaW50LmdldFR5cGVTdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIFRvb2xzLmV4dGVuZChucywge1xuICAgICAgICBpZDogXCJNYXRyaXg0XCIsXG4gICAgICAgIGtpbmQ6IFwibWF0cml4NFwiLFxuICAgICAgICBvYmplY3Q6IHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBudWxsLFxuICAgICAgICAgICAgc3RhdGljOiBudWxsXG4gICAgICAgIH0sXG4gICAgICAgIGluc3RhbmNlOiBNYXRyaXhJbnN0YW5jZVxuICAgIH0pO1xuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucyl7XG5cbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgVFlQRVMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFMsXG4gICAgICAgIEJhc2UgPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS9pbmRleC5qc1wiKSxcbiAgICAgICAgVG9vbHMgPSByZXF1aXJlKFwiLi90b29scy5qc1wiKTtcblxuICAgIHZhciBTaGFkZU9iamVjdCA9IHtcbiAgICAgICAgZGlmZnVzZToge1xuICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24ocmVzdWx0LCBhcmdzLCBjdHgpIHtcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPCAxKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTaGFkZS5kaWZmdXNlIGV4cGVjdHMgYXQgbGVhc3QgMSBwYXJhbWV0ZXIuXCIpXG4gICAgICAgICAgICAgICAgdmFyIG5vcm1hbCA9IGFyZ3NbMF07XG4gICAgICAgICAgICAgICAgaWYoIShub3JtYWwgJiYgbm9ybWFsLmNhbk5vcm1hbCgpKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGaXJzdCBhcmd1bWVudCBvZiBTaGFkZS5kaWZmdXNlIG11c3QgZXZhbHVhdGUgdG8gYSBub3JtYWxcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbG9yID0gYXJnc1sxXTtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIkNvbG9yOiBcIiwgY29sb3Iuc3RyKCksIGNvbG9yLmdldFR5cGUoY3R4KSk7XG4gICAgICAgICAgICAgICAgICAgIGlmKCFjb2xvci5jYW5Db2xvcigpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTZWNvbmQgYXJndW1lbnQgb2YgU2hhZGUuZGlmZnVzZSBtdXN0IGV2YWx1YXRlIHRvIGEgY29sb3IuIEZvdW5kOiBcIiArIGNvbG9yLnN0cigpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5PQkpFQ1QsXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IEtJTkRTLkNPTE9SX0NMT1NVUkVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBwaG9uZzoge1xuICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24ocmVzdWx0LCBhcmdzLCBjdHgpIHtcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPCAxKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTaGFkZS5waG9uZyBleHBlY3RzIGF0IGxlYXN0IDEgcGFyYW1ldGVyLlwiKVxuICAgICAgICAgICAgICAgIHZhciBub3JtYWwgPSBhcmdzWzBdO1xuICAgICAgICAgICAgICAgIGlmKCEobm9ybWFsICYmIG5vcm1hbC5jYW5Ob3JtYWwoKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmlyc3QgYXJndW1lbnQgb2YgU2hhZGUucGhvbmcgbXVzdCBldmFsdWF0ZSB0byBhIG5vcm1hbFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2hpbmluZXNzID0gYXJnc1sxXTtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIkNvbG9yOiBcIiwgY29sb3Iuc3RyKCksIGNvbG9yLmdldFR5cGUoY3R4KSk7XG4gICAgICAgICAgICAgICAgICAgIGlmKCFzaGluaW5lc3MuY2FuTnVtYmVyKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNlY29uZCBhcmd1bWVudCBvZiBTaGFkZS5waG9uZyBtdXN0IGV2YWx1YXRlIHRvIGEgbnVtYmVyLiBGb3VuZDogXCIgKyBjb2xvci5zdHIoKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxuICAgICAgICAgICAgICAgICAgICBraW5kOiBLSU5EUy5DT0xPUl9DTE9TVVJFXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xhbXA6IHtcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxuICAgICAgICAgICAgZXZhbHVhdGU6IGZ1bmN0aW9uKHJlc3VsdCwgYXJncykge1xuICAgICAgICAgICAgICAgIFRvb2xzLmNoZWNrUGFyYW1Db3VudChyZXN1bHQubm9kZSwgXCJTaGFkZS5jbGFtcFwiLCBbM10sIGFyZ3MubGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgIGlmIChhcmdzLmV2ZXJ5KGZ1bmN0aW9uKGUpIHsgcmV0dXJuIGUuY2FuTnVtYmVyKCk7IH0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0eXBlSW5mbyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRZUEVTLk5VTUJFUlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChUb29scy5hbGxBcmd1bWVudHNBcmVTdGF0aWMoYXJncykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjYWxsQXJncyA9IGFyZ3MubWFwKGZ1bmN0aW9uKGEpIHtyZXR1cm4gYS5nZXRTdGF0aWNWYWx1ZSgpOyB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVJbmZvLnN0YXRpY1ZhbHVlID0gU2hhZGUuU2hhZGUuY2xhbXAuYXBwbHkobnVsbCwgY2FsbEFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlSW5mbztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihyZXN1bHQubm9kZSwgXCJTaGFkZS5jbGFtcCBub3Qgc3VwcG9ydGVkIHdpdGggYXJndW1lbnQgdHlwZXM6IFwiICsgYXJncy5tYXAoZnVuY3Rpb24oYXJnKSB7IHJldHVybiBhcmcuZ2V0VHlwZVN0cmluZygpOyB9KS5qb2luKFwiLCBcIikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzbW9vdGhzdGVwOiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcbiAgICAgICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbihyZXN1bHQsIGFyZ3MsIGN0eCkge1xuICAgICAgICAgICAgICAgIFRvb2xzLmNoZWNrUGFyYW1Db3VudChyZXN1bHQubm9kZSwgXCJTaGFkZS5zbW9vdGhzdGVwXCIsIFszXSwgYXJncy5sZW5ndGgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MuZXZlcnkoZnVuY3Rpb24oZSkgeyByZXR1cm4gZS5jYW5OdW1iZXIoKTsgfSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHR5cGVJbmZvID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuTlVNQkVSXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKFRvb2xzLmFsbEFyZ3VtZW50c0FyZVN0YXRpYyhhcmdzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNhbGxBcmdzID0gYXJncy5tYXAoZnVuY3Rpb24oYSkge3JldHVybiBhLmdldFN0YXRpY1ZhbHVlKCk7IH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZUluZm8uc3RhdGljVmFsdWUgPSBTaGFkZS5TaGFkZS5zbW9vdGhzdGVwLmFwcGx5KG51bGwsIGNhbGxBcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHlwZUluZm87XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IocmVzdWx0Lm5vZGUsIFwiU2hhZGUuc21vb3Roc3RlcCBub3Qgc3VwcG9ydGVkIHdpdGggYXJndW1lbnQgdHlwZXM6IFwiICsgYXJncy5tYXAoZnVuY3Rpb24oYXJnKSB7IHJldHVybiBhcmcuZ2V0VHlwZVN0cmluZygpOyB9KS5qb2luKFwiLCBcIikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzdGVwOiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcbiAgICAgICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbihyZXN1bHQsIGFyZ3MsIGN0eCkge1xuICAgICAgICAgICAgICAgIFRvb2xzLmNoZWNrUGFyYW1Db3VudChyZXN1bHQubm9kZSwgXCJTaGFkZS5zdGVwXCIsIFsyXSwgYXJncy5sZW5ndGgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MuZXZlcnkoZnVuY3Rpb24oZSkgeyByZXR1cm4gZS5jYW5OdW1iZXIoKTsgfSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHR5cGVJbmZvID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuTlVNQkVSXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKFRvb2xzLmFsbEFyZ3VtZW50c0FyZVN0YXRpYyhhcmdzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNhbGxBcmdzID0gYXJncy5tYXAoZnVuY3Rpb24oYSkge3JldHVybiBhLmdldFN0YXRpY1ZhbHVlKCk7IH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZUluZm8uc3RhdGljVmFsdWUgPSBTaGFkZS5TaGFkZS5zdGVwLmFwcGx5KG51bGwsIGNhbGxBcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHlwZUluZm87XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IocmVzdWx0Lm5vZGUsIFwiU2hhZGUuc3RlcCBub3Qgc3VwcG9ydGVkIHdpdGggYXJndW1lbnQgdHlwZXM6IFwiICsgYXJncy5tYXAoZnVuY3Rpb24oYXJnKSB7IHJldHVybiBhcmcuZ2V0VHlwZVN0cmluZygpOyB9KS5qb2luKFwiLCBcIikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBmcmFjdDoge1xuICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24ocmVzdWx0LCBhcmdzKSB7XG4gICAgICAgICAgICAgICAgVG9vbHMuY2hlY2tQYXJhbUNvdW50KHJlc3VsdC5ub2RlLCBcIlNoYWRlLmZyYWN0XCIsIFsxXSwgYXJncy5sZW5ndGgpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHggPSBhcmdzWzBdO1xuICAgICAgICAgICAgICAgIGlmICh4LmNhbk51bWJlcigpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0eXBlSW5mbyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRZUEVTLk5VTUJFUlxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHguaGFzU3RhdGljVmFsdWUoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZUluZm8uc3RhdGljVmFsdWUgPSBTaGFkZS5TaGFkZS5mcmFjdCh4LmdldFN0YXRpY1ZhbHVlKCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlSW5mbztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihyZXN1bHQubm9kZSwgXCJTaGFkZS5mcmFjdCBub3Qgc3VwcG9ydGVkIHdpdGggYXJndW1lbnQgdHlwZXM6IFwiICsgYXJncy5tYXAoZnVuY3Rpb24oYXJnKSB7IHJldHVybiBhcmcuZ2V0VHlwZVN0cmluZygpOyB9KS5qb2luKFwiLCBcIikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIEJhc2UuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIlNoYWRlXCIsXG4gICAgICAgIG9iamVjdDoge1xuICAgICAgICAgICAgY29uc3RydWN0b3I6IG51bGwsXG4gICAgICAgICAgICBzdGF0aWM6IFNoYWRlT2JqZWN0XG4gICAgICAgIH0sXG4gICAgICAgIGluc3RhbmNlOiBudWxsXG4gICAgfSk7XG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uKG5zKXtcblxuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpLFxuICAgICAgICBUWVBFUyA9IFNoYWRlLlRZUEVTLFxuICAgICAgICBLSU5EUyA9IFNoYWRlLk9CSkVDVF9LSU5EUyxcbiAgICAgICAgQmFzZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9iYXNlL2luZGV4LmpzXCIpO1xuXG4gICAgdmFyIFN5c3RlbU9iamVjdCA9IHtcbiAgICAgICAgY29vcmRzOiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5PQkpFQ1QsXG4gICAgICAgICAgICBraW5kOiBLSU5EUy5GTE9BVDNcbiAgICAgICAgfSxcbiAgICAgICAgbm9ybWFsaXplZENvb3Jkczoge1xuICAgICAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxuICAgICAgICAgICAga2luZDogS0lORFMuRkxPQVQzXG4gICAgICAgIH0sXG4gICAgICAgIGhlaWdodDoge1xuICAgICAgICAgICAgdHlwZTogVFlQRVMuSU5UXG4gICAgICAgIH0sXG4gICAgICAgIHdpZHRoOiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5JTlRcbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIEJhc2UuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIlN5c3RlbVwiLFxuICAgICAgICBvYmplY3Q6IHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBudWxsLFxuICAgICAgICAgICAgc3RhdGljOiBTeXN0ZW1PYmplY3RcbiAgICAgICAgfSxcbiAgICAgICAgaW5zdGFuY2U6IG51bGxcbiAgICB9KTtcblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuICAgIHZhciBCYXNlID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvaW5kZXguanNcIik7XG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIiksXG4gICAgICAgIFRZUEVTID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxuICAgICAgICBWZWNCYXNlID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvdmVjLmpzXCIpO1xuXG4gICAgdmFyIGFsbEFyZ3VtZW50c0FyZVN0YXRpYyA9IGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgICAgIHJldHVybiBhcmdzLmV2ZXJ5KGZ1bmN0aW9uIChhcmcpIHtcbiAgICAgICAgICAgIHJldHVybiBhcmcuaGFzU3RhdGljVmFsdWUoKVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBucy5jaGVja1BhcmFtQ291bnQgPSBmdW5jdGlvbihub2RlLCBuYW1lLCBhbGxvd2VkLCBpcykge1xuICAgICAgICBpZiAoYWxsb3dlZC5pbmRleE9mKGlzKSA9PSAtMSkge1xuICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIkludmFsaWQgbnVtYmVyIG9mIHBhcmFtZXRlcnMgZm9yIFwiICsgbmFtZSArIFwiLCBleHBlY3RlZCBcIiArIGFsbG93ZWQuam9pbihcIiBvciBcIikgKyBcIiwgZm91bmQ6IFwiICsgaXMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbnMuc2luZ2xlQWNjZXNzb3IgPSBmdW5jdGlvbiAobmFtZSwgb2JqLCB2YWxpZEFyZ0NvdW50cywgc3RhdGljVmFsdWVGdW5jdGlvbikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24gKHJlc3VsdCwgYXJncywgY3R4LCBjYWxsT2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgbnMuY2hlY2tQYXJhbUNvdW50KHJlc3VsdC5ub2RlLCBuYW1lLCB2YWxpZEFyZ0NvdW50cywgYXJncy5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIHZhciB0eXBlSW5mbyA9ICBhcmdzLmxlbmd0aCA/IG9iaiA6IHsgdHlwZTogVFlQRVMuTlVNQkVSIH07XG5cbiAgICAgICAgICAgICAgICBpZiAoc3RhdGljVmFsdWVGdW5jdGlvbiAmJiBjYWxsT2JqZWN0Lmhhc1N0YXRpY1ZhbHVlKCkgJiYgYXJncy5ldmVyeShmdW5jdGlvbihhKSB7cmV0dXJuIGEuaGFzU3RhdGljVmFsdWUoKTsgfSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZUluZm8uc3RhdGljVmFsdWUgPSBzdGF0aWNWYWx1ZUZ1bmN0aW9uKGNhbGxPYmplY3QuZ2V0U3RhdGljVmFsdWUoKSwgYXJncyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0eXBlSW5mbztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBucy5leHRlbmQgPSBCYXNlLmV4dGVuZDtcblxuICAgIHZhciBWZWMgPSB7XG4gICAgICAgIFRZUEVTOiB7XG4gICAgICAgICAgICAxOiB7IHR5cGU6IFRZUEVTLk5VTUJFUiB9LFxuICAgICAgICAgICAgMjogeyB0eXBlOiBUWVBFUy5PQkpFQ1QsIGtpbmQ6IEtJTkRTLkZMT0FUMiB9LFxuICAgICAgICAgICAgMzogeyB0eXBlOiBUWVBFUy5PQkpFQ1QsIGtpbmQ6IEtJTkRTLkZMT0FUMyB9LFxuICAgICAgICAgICAgNDogeyB0eXBlOiBUWVBFUy5PQkpFQ1QsIGtpbmQ6IEtJTkRTLkZMT0FUNCB9LFxuICAgICAgICAgICAgY29sb3I6IHsgdHlwZTogVFlQRVMuT0JKRUNULCBraW5kOiBLSU5EUy5GTE9BVDMgfVxuICAgICAgICB9LFxuICAgICAgICBnZXRUeXBlOiBmdW5jdGlvbihkZXN0VmVjdG9yLCBjb2xvcil7XG4gICAgICAgICAgICBpZihkZXN0VmVjdG9yID09IDQgJiYgY29sb3IpXG4gICAgICAgICAgICAgICAgcmV0dXJuIFZlYy5UWVBFUy5jb2xvcjtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICByZXR1cm4gVmVjLlRZUEVTW2Rlc3RWZWN0b3JdO1xuICAgICAgICB9LFxuICAgICAgICBnZXRTdGF0aWNWYWx1ZTogZnVuY3Rpb24odHlwZUluZm8sIG1ldGhvZE5hbWUsIGFyZ3MsIGNhbGxPYmplY3Qpe1xuICAgICAgICAgICAgaWYoY2FsbE9iamVjdC5oYXNTdGF0aWNWYWx1ZSgpICYmIGFsbEFyZ3VtZW50c0FyZVN0YXRpYyhhcmdzKSl7XG4gICAgICAgICAgICAgICAgdmFyIG9iamVjdCA9IGNhbGxPYmplY3QuZ2V0U3RhdGljVmFsdWUoKTtcbiAgICAgICAgICAgICAgICB2YXIgY2FsbEFyZ3MgPSBhcmdzLm1hcChmdW5jdGlvbihhKSB7cmV0dXJuIGEuZ2V0U3RhdGljVmFsdWUoKTsgfSk7XG4gICAgICAgICAgICAgICAgdmFyIG1ldGhvZCA9IG9iamVjdFttZXRob2ROYW1lXTtcbiAgICAgICAgICAgICAgICBpZihtZXRob2QpXG4gICAgICAgICAgICAgICAgICAgIHR5cGVJbmZvLnN0YXRpY1ZhbHVlID0gbWV0aG9kLmFwcGx5KG9iamVjdCwgY2FsbEFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjaGVja1ZlY0FyZ3VtZW50czogZnVuY3Rpb24obWV0aG9kTmFtZSwgY29sb3IsIHZlY1NpemUsIHdpdGhFbXB0eSwgcmVzdWx0LCBhcmdzKXtcbiAgICAgICAgICAgIHdpdGhFbXB0eSA9ICh3aXRoRW1wdHkgfHwgdmVjU2l6ZSA9PSAwKTtcbiAgICAgICAgICAgIGNvbG9yID0gY29sb3IgJiYgdmVjU2l6ZSA9PSA0O1xuICAgICAgICAgICAgdmFyIGFsbG93ZWQgPSBbXTtcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IHdpdGhFbXB0eSA/IDAgOiAxOyBpIDw9IHZlY1NpemU7ICsraSkgYWxsb3dlZC5wdXNoKGkpO1xuICAgICAgICAgICAgbnMuY2hlY2tQYXJhbUNvdW50KHJlc3VsdC5ub2RlLCBtZXRob2ROYW1lLCBhbGxvd2VkLCBhcmdzLmxlbmd0aCk7XG5cbiAgICAgICAgICAgIGlmKHdpdGhFbXB0eSAmJiBhcmdzLmxlbmd0aCA9PSAwKVxuICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgaWYoYXJncy5sZW5ndGggPT0gMSAmJiBhcmdzWzBdLmNhbk51bWJlcigpKVxuICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgdmFyIGlkeCA9IDA7XG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpZHggPCB2ZWNTaXplICYmIGkgPCBhcmdzLmxlbmd0aDsgKytpKXtcbiAgICAgICAgICAgICAgICB2YXIgYXJnPSBhcmdzW2ldLCBjbnQ7XG4gICAgICAgICAgICAgICAgaWYoYXJnLmNhbk51bWJlcigpKSBjbnQgPSAxO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYoYXJnLmlzT2ZLaW5kKEtJTkRTLkZMT0FUMikpIGNudCA9IDI7XG4gICAgICAgICAgICAgICAgZWxzZSBpZihhcmcuaXNPZktpbmQoS0lORFMuRkxPQVQzKSkgY250ID0gMztcbiAgICAgICAgICAgICAgICBlbHNlIGlmKGFyZy5pc09mS2luZChLSU5EUy5GTE9BVDQpKSBjbnQgPSA0O1xuICAgICAgICAgICAgICAgIGVsc2UgU2hhZGUudGhyb3dFcnJvcihyZXN1bHQubm9kZSwgXCJJbmF2bGlkIHBhcmFtZXRlciBmb3IgXCIgKyBtZXRob2ROYW1lICsgXCIsIHR5cGUgaXMgbm90IHN1cHBvcnRlZFwiKTtcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiBQcmludCBUeXBlP1xuICAgICAgICAgICAgICAgIGlkeCArPSBjbnQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKGlkeCA8IHZlY1NpemUgJiYgKCFjb2xvciB8fCBpZHggKyAxIDwgdmVjU2l6ZSkpXG4gICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihyZXN1bHQubm9kZSwgXCJJbmF2bGlkIHBhcmFtZXRlcnMgZm9yIFwiICsgbWV0aG9kTmFtZSArIFwiLCBleHBlY3RlZCBcIiArIHZlY1NpemUgKyBcIiBzY2FsYXIgdmFsdWVzLCBnb3QgXCIgKyBpZHgpO1xuICAgICAgICAgICAgZWxzZSBpZihpIDwgYXJncy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IocmVzdWx0Lm5vZGUsIFwiSW5hdmxpZCBwYXJhbWV0ZXJzIGZvciBcIiArIG1ldGhvZE5hbWUgKyBcIiwgdG9vIG1hbnkgcGFyYW1ldGVyc1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgdmVjRXZhbHVhdGU6IGZ1bmN0aW9uKG9iamVjdE5hbWUsIG1ldGhvZE5hbWUsIGNvbG9yLCBkZXN0VmVjU2l6ZSwgc3JjVmVjU2l6ZSwgcmVzdWx0LCBhcmdzLCBjdHgsIGNhbGxPYmplY3Qpe1xuICAgICAgICAgICAgVmVjLmNoZWNrVmVjQXJndW1lbnRzKG9iamVjdE5hbWUgKyBcIi5cIiArIG1ldGhvZE5hbWUsIGNvbG9yLCBzcmNWZWNTaXplLCBmYWxzZSwgcmVzdWx0LCBhcmdzKTtcblxuICAgICAgICAgICAgdmFyIHR5cGVJbmZvID0ge307XG4gICAgICAgICAgICBCYXNlLmV4dGVuZCh0eXBlSW5mbywgVmVjLmdldFR5cGUoZGVzdFZlY1NpemUsIGNvbG9yKSk7XG5cbiAgICAgICAgICAgIFZlYy5nZXRTdGF0aWNWYWx1ZSh0eXBlSW5mbywgbWV0aG9kTmFtZSwgYXJncywgY2FsbE9iamVjdCk7XG4gICAgICAgICAgICByZXR1cm4gdHlwZUluZm87XG4gICAgICAgIH0sXG5cbiAgICAgICAgb3B0aW9uYWxaZXJvRXZhbHVhdGU6IGZ1bmN0aW9uKG9iamVjdE5hbWUsIGNvbG9yLCBtZXRob2ROYW1lLCBkZXN0VmVjU2l6ZSwgemVyb0Rlc3RWZWNTaXplLCBzcmNWZWNTaXplLCByZXN1bHQsIGFyZ3MsIGN0eCwgY2FsbE9iamVjdCkge1xuICAgICAgICAgICAgdmFyIHF1YWxpZmllZE5hbWUgPSBvYmplY3ROYW1lICsgXCIuXCIgKyBtZXRob2ROYW1lO1xuICAgICAgICAgICAgdmFyIHR5cGVJbmZvID0ge307XG5cbiAgICAgICAgICAgIGlmKGFyZ3MubGVuZ3RoID09IDApe1xuICAgICAgICAgICAgICAgIEJhc2UuZXh0ZW5kKHR5cGVJbmZvLCBWZWMuZ2V0VHlwZSh6ZXJvRGVzdFZlY1NpemUsIGNvbG9yKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIFZlYy5jaGVja1ZlY0FyZ3VtZW50cyhxdWFsaWZpZWROYW1lLCBjb2xvciwgc3JjVmVjU2l6ZSwgdHJ1ZSwgcmVzdWx0LCBhcmdzKTtcbiAgICAgICAgICAgICAgICBCYXNlLmV4dGVuZCh0eXBlSW5mbywgVmVjLmdldFR5cGUoZGVzdFZlY1NpemUsIGNvbG9yKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBWZWMuZ2V0U3RhdGljVmFsdWUodHlwZUluZm8sIG1ldGhvZE5hbWUsIGFyZ3MsIGNhbGxPYmplY3QpO1xuXG4gICAgICAgICAgICByZXR1cm4gdHlwZUluZm87XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3dpenpsZUV2YWx1YXRlOiBmdW5jdGlvbihvYmplY3ROYW1lLCBjb2xvciwgdmVjU2l6ZSwgc3dpenpsZSwgd2l0aFNldHRlciwgcmVzdWx0LCBhcmdzLCBjdHgsIGNhbGxPYmplY3QpIHtcbiAgICAgICAgICAgIGlmKHdpdGhTZXR0ZXIpe1xuICAgICAgICAgICAgICAgIHJldHVybiBWZWMub3B0aW9uYWxaZXJvRXZhbHVhdGUob2JqZWN0TmFtZSwgY29sb3IsIHN3aXp6bGUsIHZlY1NpemUsIHN3aXp6bGUubGVuZ3RoLCBzd2l6emxlLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LCBhcmdzLCBjdHgsIGNhbGxPYmplY3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICByZXR1cm4gVmVjLnZlY0V2YWx1YXRlKG9iamVjdE5hbWUsIHN3aXp6bGUsIGNvbG9yLCBzd2l6emxlLmxlbmd0aCwgMCwgcmVzdWx0LCBhcmdzLCBjdHgsIGNhbGxPYmplY3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBnZXRTd2l6emxlRXZhbHVhdGU6IGZ1bmN0aW9uKG9iamVjdE5hbWUsIGNvbG9yLCB2ZWNTaXplLCBzd2l6emxlKXtcbiAgICAgICAgICAgIHZhciBpbmRpY2VzID0gW10sIHdpdGhTZXR0ZXIgPSAoc3dpenpsZS5sZW5ndGggPD0gdmVjU2l6ZSk7XG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyB3aXRoU2V0dGVyICYmIGkgPCBzd2l6emxlLmxlbmd0aDsgKytpKXtcbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gVmVjQmFzZS5zd2l6emxlVG9JbmRleChzd2l6emxlLmNoYXJBdChpKSk7XG4gICAgICAgICAgICAgICAgaWYoaW5kaWNlc1tpZHhdKVxuICAgICAgICAgICAgICAgICAgICB3aXRoU2V0dGVyID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBpbmRpY2VzW2lkeF0gPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICB7XG4gICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXG4gICAgICAgICAgICAgICAgZXZhbHVhdGU6IFZlYy5zd2l6emxlRXZhbHVhdGUuYmluZChudWxsLCBvYmplY3ROYW1lLCBjb2xvciwgdmVjU2l6ZSwgc3dpenpsZSwgd2l0aFNldHRlcilcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgYXR0YWNoU3dpenpsZXM6IGZ1bmN0aW9uIChpbnN0YW5jZSwgb2JqZWN0TmFtZSwgY29sb3IsIHZlY0NvdW50KXtcbiAgICAgICAgICAgIGZvcih2YXIgcyA9IDA7IHMgPCBWZWNCYXNlLnN3aXp6bGVTZXRzLmxlbmd0aDsgKytzKXtcbiAgICAgICAgICAgICAgICBmb3IodmFyIGNvdW50ID0gMTsgY291bnQgPD0gNDsgKytjb3VudCl7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtYXggPSBNYXRoLnBvdyh2ZWNDb3VudCwgY291bnQpO1xuICAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IG1heDsgKytpKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YWwgPSBpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGtleSA9IFwiXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IodmFyICBqID0gMDsgaiA8IGNvdW50OyArK2ope1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHggPSB2YWwgJSB2ZWNDb3VudDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSBNYXRoLmZsb29yKHZhbCAvIHZlY0NvdW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXkrPSBWZWNCYXNlLnN3aXp6bGVTZXRzW3NdW2lkeF07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZVtrZXldID0gVmVjLmdldFN3aXp6bGVFdmFsdWF0ZShvYmplY3ROYW1lLCBjb2xvciwgdmVjQ291bnQsIGtleSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGF0dGFjaFZlY01ldGhvZHM6IGZ1bmN0aW9uKGluc3RhbmNlLCBvYmplY3ROYW1lLCBjb2xvciwgZGVzdFZlY1NpemUsIHNyY1ZlY1NpemUsIG1ldGhvZE5hbWVzKXtcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBtZXRob2ROYW1lcy5sZW5ndGg7ICsraSl7XG4gICAgICAgICAgICAgICAgdmFyIG1ldGhvZE5hbWUgPSBtZXRob2ROYW1lc1tpXTtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZVttZXRob2ROYW1lXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXG4gICAgICAgICAgICAgICAgICAgIGV2YWx1YXRlOiBWZWMudmVjRXZhbHVhdGUuYmluZChudWxsLCBvYmplY3ROYW1lLCBtZXRob2ROYW1lLCBjb2xvciwgZGVzdFZlY1NpemUsIHNyY1ZlY1NpemUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjb25zdHJ1Y3RvckV2YWx1YXRlOiBmdW5jdGlvbihvYmplY3ROYW1lLCBjb2xvciwgdmVjU2l6ZSwgcmVzdWx0LCBhcmdzLCBjdHgpIHtcbiAgICAgICAgICAgIFZlYy5jaGVja1ZlY0FyZ3VtZW50cyhvYmplY3ROYW1lLCBjb2xvciwgdmVjU2l6ZSwgdHJ1ZSwgcmVzdWx0LCBhcmdzKTtcbiAgICAgICAgICAgIHZhciBhcmdBcnJheSA9IFtdO1xuICAgICAgICAgICAgdmFyIGlzU3RhdGljID0gdHJ1ZTtcbiAgICAgICAgICAgIGFyZ3MuZm9yRWFjaChmdW5jdGlvbiAocGFyYW0sIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgaXNTdGF0aWMgPSBpc1N0YXRpYyAmJiBwYXJhbS5oYXNTdGF0aWNWYWx1ZSgpO1xuICAgICAgICAgICAgICAgIGlmIChpc1N0YXRpYylcbiAgICAgICAgICAgICAgICAgICAgYXJnQXJyYXkucHVzaChwYXJhbS5nZXRTdGF0aWNWYWx1ZSgpKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB2YXIgdHlwZUluZm8gPSBCYXNlLmV4dGVuZCh7fSxWZWMuZ2V0VHlwZSh2ZWNTaXplLCBjb2xvcikpO1xuXG4gICAgICAgICAgICBpZiAoaXNTdGF0aWMpIHtcbiAgICAgICAgICAgICAgICB2YXIgdiA9IG5ldyBTaGFkZVtvYmplY3ROYW1lXSgpO1xuICAgICAgICAgICAgICAgIFNoYWRlW29iamVjdE5hbWVdLmFwcGx5KHYsIGFyZ0FycmF5KTtcbiAgICAgICAgICAgICAgICB0eXBlSW5mby5zdGF0aWNWYWx1ZSA9IHY7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHlwZUluZm87XG4gICAgICAgIH1cblxuICAgIH07XG4gICAgbnMuVmVjID0gVmVjO1xuICAgIG5zLmFsbEFyZ3VtZW50c0FyZVN0YXRpYyA9IGFsbEFyZ3VtZW50c0FyZVN0YXRpYztcblxuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucyl7XG5cbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgVFlQRVMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFMsXG4gICAgICAgIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XG5cbiAgICB2YXIgVmVjdG9yMkNvbnN0cnVjdG9yID0gIHtcbiAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxuICAgICAgICBraW5kOiBLSU5EUy5GTE9BVDIsXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge0Fubm90YXRpb259IHJlc3VsdFxuICAgICAgICAgKiBAcGFyYW0ge0FycmF5LjxBbm5vdGF0aW9uPn0gYXJnc1xuICAgICAgICAgKiBAcGFyYW0ge0NvbnRleHR9IGN0eFxuICAgICAgICAgKi9cbiAgICAgICAgZXZhbHVhdGU6IFRvb2xzLlZlYy5jb25zdHJ1Y3RvckV2YWx1YXRlLmJpbmQobnVsbCwgXCJWZWMyXCIsIGZhbHNlLCAyKVxuICAgIH07XG5cbiAgICB2YXIgVmVjdG9yMlN0YXRpY09iamVjdCA9IHtcbiAgICB9O1xuXG4gICAgdmFyIFZlY3RvcjJJbnN0YW5jZSA9IHtcbiAgICAgICAgbGVuZ3RoOiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcbiAgICAgICAgICAgIGV2YWx1YXRlOiBUb29scy5WZWMub3B0aW9uYWxaZXJvRXZhbHVhdGUuYmluZChudWxsLFwiVmVjMlwiLCBmYWxzZSwgXCJsZW5ndGhcIiwgMiwgMSwgMSlcbiAgICAgICAgfVxuICAgIH07XG4gICAgVG9vbHMuVmVjLmF0dGFjaFN3aXp6bGVzKFZlY3RvcjJJbnN0YW5jZSwgXCJWZWMyXCIsIGZhbHNlLCAyKTtcbiAgICBUb29scy5WZWMuYXR0YWNoVmVjTWV0aG9kcyhWZWN0b3IySW5zdGFuY2UsIFwiVmVjMlwiLCBmYWxzZSwgMiwgMiwgWydhZGQnLCAnc3ViJywgJ211bCcsICdkaXYnLCAnbW9kJ10pO1xuICAgIFRvb2xzLlZlYy5hdHRhY2hWZWNNZXRob2RzKFZlY3RvcjJJbnN0YW5jZSwgXCJWZWMyXCIsIGZhbHNlLCAxLCAyLCBbJ2RvdCddKTtcbiAgICBUb29scy5WZWMuYXR0YWNoVmVjTWV0aG9kcyhWZWN0b3IySW5zdGFuY2UsIFwiVmVjMlwiLCBmYWxzZSwgMiwgMCwgWydub3JtYWxpemUnXSk7XG5cblxuICAgIFRvb2xzLmV4dGVuZChucywge1xuICAgICAgICBpZDogXCJWZWMyXCIsXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUMixcbiAgICAgICAgb2JqZWN0OiB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogVmVjdG9yMkNvbnN0cnVjdG9yLFxuICAgICAgICAgICAgc3RhdGljOiBWZWN0b3IyU3RhdGljT2JqZWN0XG4gICAgICAgIH0sXG4gICAgICAgIGluc3RhbmNlOiBWZWN0b3IySW5zdGFuY2VcbiAgICB9KTtcblxuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucyl7XG5cbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgVFlQRVMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFMsXG4gICAgICAgIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XG5cbiAgICB2YXIgVmVjdG9yM0NvbnN0cnVjdG9yID0gIHtcbiAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxuICAgICAgICBraW5kOiBLSU5EUy5GTE9BVDMsXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge0Fubm90YXRpb259IHJlc3VsdFxuICAgICAgICAgKiBAcGFyYW0ge0FycmF5LjxBbm5vdGF0aW9uPn0gYXJnc1xuICAgICAgICAgKiBAcGFyYW0ge0NvbnRleHR9IGN0eFxuICAgICAgICAgKi9cbiAgICAgICAgZXZhbHVhdGU6IFRvb2xzLlZlYy5jb25zdHJ1Y3RvckV2YWx1YXRlLmJpbmQobnVsbCwgXCJWZWMzXCIsIGZhbHNlLCAzKVxuICAgIH07XG5cbiAgICB2YXIgVmVjdG9yM1N0YXRpY09iamVjdCA9IHtcbiAgICB9O1xuXG4gICAgdmFyIFZlY3RvcjNJbnN0YW5jZSA9IHtcbiAgICAgICAgbGVuZ3RoOiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcbiAgICAgICAgICAgIGV2YWx1YXRlOiBUb29scy5WZWMub3B0aW9uYWxaZXJvRXZhbHVhdGUuYmluZChudWxsLFwiVmVjM1wiLCBmYWxzZSwgXCJsZW5ndGhcIiwgMywgMSwgMSlcbiAgICAgICAgfVxuICAgIH07XG4gICAgVG9vbHMuVmVjLmF0dGFjaFN3aXp6bGVzKFZlY3RvcjNJbnN0YW5jZSwgXCJWZWMzXCIsIGZhbHNlLCAzKTtcbiAgICBUb29scy5WZWMuYXR0YWNoVmVjTWV0aG9kcyhWZWN0b3IzSW5zdGFuY2UsIFwiVmVjM1wiLCBmYWxzZSwgMywgMywgWydhZGQnLCAnc3ViJywgJ211bCcsICdkaXYnLCAnbW9kJ10pO1xuICAgIFRvb2xzLlZlYy5hdHRhY2hWZWNNZXRob2RzKFZlY3RvcjNJbnN0YW5jZSwgXCJWZWMzXCIsIGZhbHNlLCAxLCAzLCBbJ2RvdCddKTtcbiAgICBUb29scy5WZWMuYXR0YWNoVmVjTWV0aG9kcyhWZWN0b3IzSW5zdGFuY2UsIFwiVmVjM1wiLCBmYWxzZSwgMywgMCwgWydub3JtYWxpemUnXSk7XG5cblxuICAgIFRvb2xzLmV4dGVuZChucywge1xuICAgICAgICBpZDogXCJWZWMzXCIsXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUMyxcbiAgICAgICAgb2JqZWN0OiB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogVmVjdG9yM0NvbnN0cnVjdG9yLFxuICAgICAgICAgICAgc3RhdGljOiBWZWN0b3IzU3RhdGljT2JqZWN0XG4gICAgICAgIH0sXG4gICAgICAgIGluc3RhbmNlOiBWZWN0b3IzSW5zdGFuY2VcbiAgICB9KTtcblxuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucyl7XG5cbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgVFlQRVMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFMsXG4gICAgICAgIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XG5cbiAgICB2YXIgVmVjdG9yNENvbnN0cnVjdG9yID0gIHtcbiAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxuICAgICAgICBraW5kOiBLSU5EUy5GTE9BVDQsXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge0Fubm90YXRpb259IHJlc3VsdFxuICAgICAgICAgKiBAcGFyYW0ge0FycmF5LjxBbm5vdGF0aW9uPn0gYXJnc1xuICAgICAgICAgKiBAcGFyYW0ge0NvbnRleHR9IGN0eFxuICAgICAgICAgKi9cbiAgICAgICAgZXZhbHVhdGU6IFRvb2xzLlZlYy5jb25zdHJ1Y3RvckV2YWx1YXRlLmJpbmQobnVsbCwgXCJWZWM0XCIsIGZhbHNlLCA0KVxuICAgIH07XG5cbiAgICB2YXIgVmVjdG9yNFN0YXRpY09iamVjdCA9IHtcbiAgICB9O1xuXG4gICAgdmFyIFZlY3RvcjRJbnN0YW5jZSA9IHtcbiAgICAgICAgbGVuZ3RoOiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcbiAgICAgICAgICAgIGV2YWx1YXRlOiBUb29scy5WZWMub3B0aW9uYWxaZXJvRXZhbHVhdGUuYmluZChudWxsLFwiVmVjNFwiLCBmYWxzZSwgXCJsZW5ndGhcIiwgNCwgMSwgMSlcbiAgICAgICAgfVxuICAgIH07XG4gICAgVG9vbHMuVmVjLmF0dGFjaFN3aXp6bGVzKFZlY3RvcjRJbnN0YW5jZSwgXCJWZWM0XCIsIGZhbHNlLCA0KTtcbiAgICBUb29scy5WZWMuYXR0YWNoVmVjTWV0aG9kcyhWZWN0b3I0SW5zdGFuY2UsIFwiVmVjNFwiLCBmYWxzZSwgNCwgNCwgWydhZGQnLCAnc3ViJywgJ211bCcsICdkaXYnLCAnbW9kJ10pO1xuICAgIFRvb2xzLlZlYy5hdHRhY2hWZWNNZXRob2RzKFZlY3RvcjRJbnN0YW5jZSwgXCJWZWM0XCIsIGZhbHNlLCAxLCA0LCBbJ2RvdCddKTtcbiAgICBUb29scy5WZWMuYXR0YWNoVmVjTWV0aG9kcyhWZWN0b3I0SW5zdGFuY2UsIFwiVmVjNFwiLCBmYWxzZSwgNCwgMCwgWydub3JtYWxpemUnXSk7XG5cblxuICAgIFRvb2xzLmV4dGVuZChucywge1xuICAgICAgICBpZDogXCJWZWM0XCIsXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUNCxcbiAgICAgICAgb2JqZWN0OiB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogVmVjdG9yNENvbnN0cnVjdG9yLFxuICAgICAgICAgICAgc3RhdGljOiBWZWN0b3I0U3RhdGljT2JqZWN0XG4gICAgICAgIH0sXG4gICAgICAgIGluc3RhbmNlOiBWZWN0b3I0SW5zdGFuY2VcbiAgICB9KTtcblxuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbiAobnMpIHtcbiAgICAvKipcbiAgICAgKiBTaGFkZS5qcyBzcGVjaWZpYyB0eXBlIGluZmVyZW5jZSB0aGF0IGlzIGFsc28gaW5mZXJyaW5nXG4gICAgICogdmlydHVhbCB0eXBlcyB7QGxpbmsgU2hhZGUuVFlQRVMgfVxuICAgICAqL1xuXG4gICAgdmFyIHdhbGsgPSByZXF1aXJlKCdlc3RyYXZlcnNlJyksXG4gICAgICAgIGVudGVyRXhwcmVzc2lvbiA9IHJlcXVpcmUoJy4vaW5mZXJfZXhwcmVzc2lvbi5qcycpLmVudGVyRXhwcmVzc2lvbixcbiAgICAgICAgZXhpdEV4cHJlc3Npb24gPSByZXF1aXJlKCcuL2luZmVyX2V4cHJlc3Npb24uanMnKS5leGl0RXhwcmVzc2lvbixcbiAgICAgICAgZW50ZXJTdGF0ZW1lbnQgPSByZXF1aXJlKCcuL2luZmVyX3N0YXRlbWVudC5qcycpLmVudGVyU3RhdGVtZW50LFxuICAgICAgICBleGl0U3RhdGVtZW50ID0gcmVxdWlyZSgnLi9pbmZlcl9zdGF0ZW1lbnQuanMnKS5leGl0U3RhdGVtZW50LFxuXG4gICAgICAgIE9iamVjdFJlZ2lzdHJ5ID0gcmVxdWlyZShcIi4vcmVnaXN0cnkvaW5kZXguanNcIikuUmVnaXN0cnksXG4gICAgICAgIENvbnRleHQgPSByZXF1aXJlKFwiLi8uLi8uLi9iYXNlL2NvbnRleHQuanNcIikuZ2V0Q29udGV4dChPYmplY3RSZWdpc3RyeSksXG4gICAgICAgIEJhc2UgPSByZXF1aXJlKFwiLi4vLi4vYmFzZS9pbmRleC5qc1wiKSxcbiAgICAgICAgQW5ub3RhdGlvbiA9IHJlcXVpcmUoXCIuLy4uLy4uL2Jhc2UvYW5ub3RhdGlvbi5qc1wiKS5Bbm5vdGF0aW9uLFxuICAgICAgICBGdW5jdGlvbkFubm90YXRpb24gPSByZXF1aXJlKFwiLi8uLi8uLi9iYXNlL2Fubm90YXRpb24uanNcIikuRnVuY3Rpb25Bbm5vdGF0aW9uO1xuXG5cblxuICAgIHZhciBTeW50YXggPSB3YWxrLlN5bnRheDtcblxuXG4gICAgdmFyIHJlZ2lzdGVyR2xvYmFsQ29udGV4dCA9IGZ1bmN0aW9uIChwcm9ncmFtKSB7XG4gICAgICAgIHZhciBjdHggPSBuZXcgQ29udGV4dChwcm9ncmFtLCBudWxsLCB7bmFtZTogXCJnbG9iYWxcIn0pO1xuICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJNYXRoXCIsIE9iamVjdFJlZ2lzdHJ5LmdldEJ5TmFtZShcIk1hdGhcIikpO1xuICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJDb2xvclwiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJDb2xvclwiKSk7XG4gICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIlZlYzJcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiVmVjMlwiKSk7XG4gICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIlZlYzNcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiVmVjM1wiKSk7XG4gICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIlZlYzRcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiVmVjNFwiKSk7XG4gICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIlNoYWRlXCIsIE9iamVjdFJlZ2lzdHJ5LmdldEJ5TmFtZShcIlNoYWRlXCIpKTtcbiAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwidGhpc1wiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJTeXN0ZW1cIikpO1xuICAgICAgICByZXR1cm4gY3R4O1xuICAgIH1cblxuICAgIHZhciBUeXBlSW5mZXJlbmNlID0gZnVuY3Rpb24gKHJvb3QsIG9wdCkge1xuICAgICAgICBvcHQgPSBvcHQgfHwge307XG4gICAgICAgIHRoaXMucm9vdCA9IHJvb3Q7XG4gICAgICAgIHRoaXMuY29udGV4dCA9IFtdO1xuICAgICAgICAvKiogQHR5cGUge09iamVjdC48U3RyaW5nLCBBcnJheS48VHlwZUluZm8+fSAqKi9cbiAgICAgICAgdGhpcy5pbmplY3Rpb25zID0ge307XG4gICAgICAgIHRoaXMuZW50cnlQb2ludCA9IG9wdC5lbnRyeSB8fCBcImdsb2JhbC5zaGFkZVwiO1xuICAgICAgICB0aGlzLnJvb3QuaW5qZWN0aW9ucyA9IHRoaXMuaW5qZWN0aW9ucztcbiAgICAgICAgdGhpcy5mdW5jdGlvbnMgPSB7XG4gICAgICAgICAgICBvcmlnOiB7fSxcbiAgICAgICAgICAgIGRlcml2ZWQ6IHt9XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIEJhc2UuZXh0ZW5kKFR5cGVJbmZlcmVuY2UucHJvdG90eXBlLCB7XG4gICAgICAgIHB1c2hDb250ZXh0OiBmdW5jdGlvbiAoY29udGV4dCkge1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LnB1c2goY29udGV4dCk7XG4gICAgICAgICAgICB2YXIgaW5qZWN0aW9uID0gdGhpcy5pbmplY3Rpb25zW2NvbnRleHQuc3RyKCldO1xuICAgICAgICAgICAgaWYgKGluamVjdGlvbikge1xuICAgICAgICAgICAgICAgIGNvbnRleHQuaW5qZWN0UGFyYW1ldGVycyhpbmplY3Rpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBwb3BDb250ZXh0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmNvbnRleHQucG9wKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHBlZWtDb250ZXh0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb250ZXh0W3RoaXMuY29udGV4dC5sZW5ndGggLSAxXTtcbiAgICAgICAgfSxcbiAgICAgICAgY3JlYXRlQ29udGV4dDogZnVuY3Rpb24gKG5vZGUsIHBhcmVudENvbnRleHQsIG5hbWUpIHtcbiAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBDb250ZXh0KG5vZGUsIHBhcmVudENvbnRleHQsIHtuYW1lOiBuYW1lIH0gKTtcbiAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSxcblxuICAgICAgICBhbm5vdGF0ZVBhcmFtZXRlcnM6IGZ1bmN0aW9uKGFycikge1xuICAgICAgICAgICAgcmV0dXJuIGFyciA/IGFyci5tYXAoZnVuY3Rpb24ocGFyYW0pIHtcbiAgICAgICAgICAgICAgICB2YXIgYW5ub3RhdGVkID0gIG5ldyBBbm5vdGF0aW9uKHBhcmFtKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYW5ub3RhdGVkO1xuICAgICAgICAgICAgfSkgOiBbXTtcbiAgICAgICAgfSxcblxuXG4gICAgICAgIGJ1aWxkRnVuY3Rpb25NYXA6IGZ1bmN0aW9uKHByZykge1xuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAgICAgd2Fsay5yZXBsYWNlKHByZywge1xuICAgICAgICAgICAgICAgIGVudGVyOiBmdW5jdGlvbihub2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLnR5cGUgPT0gU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgRnVuY3Rpb25Bbm5vdGF0aW9uKG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZ1bmN0aW9uTmFtZSA9IG5vZGUuaWQubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwYXJlbnRDb250ZXh0ID0gdGhhdC5wZWVrQ29udGV4dCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZ1bmN0aW9uQ29udGV4dCA9IHRoYXQuY3JlYXRlQ29udGV4dChub2RlLCBwYXJlbnRDb250ZXh0LCBmdW5jdGlvbk5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb25Db250ZXh0LmRlY2xhcmVQYXJhbWV0ZXJzKG5vZGUucGFyYW1zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudENvbnRleHQuZGVjbGFyZVZhcmlhYmxlKGZ1bmN0aW9uTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRDb250ZXh0LnVwZGF0ZUV4cHJlc3Npb24oZnVuY3Rpb25OYW1lLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wdXNoQ29udGV4dChmdW5jdGlvbkNvbnRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5mdW5jdGlvbnMub3JpZ1tmdW5jdGlvbkNvbnRleHQuc3RyKCldID0gbm9kZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbGVhdmU6IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUudHlwZSA9PSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wb3BDb250ZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB0eXBlOiBTeW50YXguRW1wdHlTdGF0ZW1lbnQgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICBwcmcuYm9keSA9IHByZy5ib2R5LmZpbHRlcihmdW5jdGlvbihhKSB7IHJldHVybiBhLnR5cGUgIT0gU3ludGF4LkVtcHR5U3RhdGVtZW50OyB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICB0cmF2ZXJzZTogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIHdhbGsudHJhdmVyc2Uobm9kZSwge1xuICAgICAgICAgICAgICAgIGVudGVyOiB0aGlzLmVudGVyTm9kZS5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgIGxlYXZlOiB0aGlzLmV4aXROb2RlLmJpbmQodGhpcylcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZW50ZXJOb2RlOiBmdW5jdGlvbiAobm9kZSwgcGFyZW50KSB7XG4gICAgICAgICAgICB2YXIgY29udGV4dCA9IHRoaXMuY29udGV4dFt0aGlzLmNvbnRleHQubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zd2l0Y2hLaW5kKG5vZGUsIHBhcmVudCwgY29udGV4dCwgZW50ZXJTdGF0ZW1lbnQsIGVudGVyRXhwcmVzc2lvbik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZXhpdE5vZGU6IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQpIHtcbiAgICAgICAgICAgIHZhciBjb250ZXh0ID0gdGhpcy5jb250ZXh0W3RoaXMuY29udGV4dC5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN3aXRjaEtpbmQobm9kZSwgcGFyZW50LCBjb250ZXh0LCBleGl0U3RhdGVtZW50LCBleGl0RXhwcmVzc2lvbik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3dpdGNoS2luZDogZnVuY3Rpb24gKG5vZGUsIHBhcmVudCwgY3R4LCBzdGF0ZW1lbnQsIGV4cHJlc3Npb24pIHtcbiAgICAgICAgICAgIHN3aXRjaCAobm9kZS50eXBlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQmxvY2tTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQnJlYWtTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQ2F0Y2hDbGF1c2U6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQ29udGludWVTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRGlyZWN0aXZlU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkRvV2hpbGVTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRGVidWdnZXJTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRW1wdHlTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRXhwcmVzc2lvblN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Gb3JTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRm9ySW5TdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5JZlN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5MYWJlbGVkU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlByb2dyYW06XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguUmV0dXJuU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlN3aXRjaFN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Td2l0Y2hDYXNlOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlRocm93U3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlRyeVN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5WYXJpYWJsZURlY2xhcmF0aW9uOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlZhcmlhYmxlRGVjbGFyYXRvcjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5XaGlsZVN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5XaXRoU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3RhdGVtZW50LmNhbGwodGhpcywgbm9kZSwgcGFyZW50LCBjdHgpO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQXNzaWdubWVudEV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQXJyYXlFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkFycmF5UGF0dGVybjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5CaW5hcnlFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkNhbGxFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkNvbmRpdGlvbmFsRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5GdW5jdGlvbkV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguSWRlbnRpZmllcjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5MaXRlcmFsOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkxvZ2ljYWxFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4Lk1lbWJlckV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguTmV3RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5PYmplY3RFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4Lk9iamVjdFBhdHRlcm46XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguUHJvcGVydHk6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguU2VxdWVuY2VFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlRoaXNFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlVuYXJ5RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5VcGRhdGVFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LllpZWxkRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGV4cHJlc3Npb24uY2FsbCh0aGlzLCBub2RlLCBwYXJlbnQsIGN0eCk7XG5cbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gbm9kZSB0eXBlOiAnICsgbm9kZS50eXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IGZ1bmN0aW9uQVNUXG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXkuPFR5cGVJbmZvPiBwYXJhbXNcbiAgICAgICAgICogQHBhcmFtIHtDb250ZXh0fSBwYXJlbnRDb250ZXh0XG4gICAgICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAgICAgKi9cbiAgICAgICAgaW5mZXJGdW5jdGlvbjogZnVuY3Rpb24gKGZ1bmN0aW9uQVNULCBwYXJhbXMsIHBhcmVudENvbnRleHQpIHtcbiAgICAgICAgICAgIHZhciBmdW5jdGlvbk5hbWUgPSBmdW5jdGlvbkFTVC5pZC5uYW1lO1xuICAgICAgICAgICAgdmFyIHRhcmdldENvbnRleHROYW1lID0gcGFyZW50Q29udGV4dC5nZXRWYXJpYWJsZUlkZW50aWZpZXIoZnVuY3Rpb25OYW1lKTtcbiAgICAgICAgICAgIHRoaXMuaW5qZWN0aW9uc1t0YXJnZXRDb250ZXh0TmFtZV0gPSBwYXJhbXM7XG5cbiAgICAgICAgICAgIC8vIFdlIGhhdmUgYSBzcGVjaWZjIHR5cGUgc2V0IGluIHBhcmFtcyB0aGF0IHdlIGFubm90YXRlIHRvIHRoZVxuICAgICAgICAgICAgLy8gZnVuY3Rpb24gQVNUXG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgcGFyYW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGkgPT0gZnVuY3Rpb25BU1QucGFyYW1zLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgdmFyIGZ1bmNQYXJhbSA9IG5ldyBBbm5vdGF0aW9uKGZ1bmN0aW9uQVNULnBhcmFtc1tpXSk7XG4gICAgICAgICAgICAgICAgZnVuY1BhcmFtLnNldEZyb21FeHRyYShwYXJhbXNbaV0uZ2V0RXh0cmEoKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBvbGRFbnRyeVBvaW50ID0gdGhpcy5lbnRyeVBvaW50O1xuICAgICAgICAgICAgdGhpcy5lbnRyeVBvaW50ID0gdGFyZ2V0Q29udGV4dE5hbWU7XG4gICAgICAgICAgICB0aGlzLnB1c2hDb250ZXh0KHBhcmVudENvbnRleHQpO1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIlN0YXJ0aW5nIHRvIHRyYXZlcnNlOiBcIiArIGZ1bmN0aW9uTmFtZSArIFwiIGluIGNvbnRleHQgXCIgKyBwYXJlbnRDb250ZXh0LnN0cigpKVxuICAgICAgICAgICAgdmFyIGFzdCA9IHRoaXMudHJhdmVyc2UoZnVuY3Rpb25BU1QpO1xuICAgICAgICAgICAgdGhpcy5wb3BDb250ZXh0KCk7XG4gICAgICAgICAgICB0aGlzLmVudHJ5UG9pbnQgPSBvbGRFbnRyeVBvaW50O1xuXG4gICAgICAgICAgICByZXR1cm4gYXN0O1xuICAgICAgICB9LFxuXG4gICAgICAgIGluZmVyUHJvZ3JhbTogZnVuY3Rpb24ocHJnLCBwYXJhbXMpIHtcbiAgICAgICAgICAgIHZhciBwYXJhbXMgPSBwYXJhbXMgfHwge307XG4gICAgICAgICAgICB2YXIgcHJvZ3JhbUNvbnRleHQgPSByZWdpc3Rlckdsb2JhbENvbnRleHQocHJnKTtcblxuICAgICAgICAgICAgdGhpcy5wdXNoQ29udGV4dChwcm9ncmFtQ29udGV4dCk7XG4gICAgICAgICAgICB0aGlzLmJ1aWxkRnVuY3Rpb25NYXAocHJnKTtcbiAgICAgICAgICAgIHRoaXMudHJhdmVyc2UocHJnKTtcbiAgICAgICAgICAgIHRoaXMucG9wQ29udGV4dCgpO1xuXG4gICAgICAgICAgICB2YXIgZW50cnlQb2ludCA9IHRoaXMuZW50cnlQb2ludDtcbiAgICAgICAgICAgIGlmICh0aGlzLmZ1bmN0aW9ucy5vcmlnLmhhc093blByb3BlcnR5KGVudHJ5UG9pbnQpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFzdCA9IHRoaXMuZnVuY3Rpb25zLm9yaWdbZW50cnlQb2ludF07XG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHRoaXMuYW5ub3RhdGVQYXJhbWV0ZXJzKHBhcmFtc1tlbnRyeVBvaW50XSk7XG4gICAgICAgICAgICAgICAgdmFyIGFhc3QgPSB0aGlzLmluZmVyRnVuY3Rpb24oYXN0LCBwYXJhbXMsIHByb2dyYW1Db250ZXh0KTtcbiAgICAgICAgICAgICAgICBmb3IodmFyIGZ1bmMgaW4gdGhpcy5mdW5jdGlvbnMuZGVyaXZlZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdmFyaWF0aW9ucyA9IHRoaXMuZnVuY3Rpb25zLmRlcml2ZWRbZnVuY107XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIHNpZ25hdHVyZSBpbiB2YXJpYXRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmcuYm9keS5wdXNoKHZhcmlhdGlvbnNbc2lnbmF0dXJlXS5hc3QpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcHJnLmJvZHkucHVzaChhYXN0KTtcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5jb250ZXh0Lmxlbmd0aClcbiAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIlNvbWV0aGluZyB3ZW50IHdyb25nXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHByZztcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0RnVuY3Rpb25JbmZvcm1hdGlvbkZvcjogZnVuY3Rpb24obmFtZSwgYXJncywgZGVmaW5pbmdDb250ZXh0KSB7XG4gICAgICAgICAgICB2YXIgc2lnbmF0dXJlID0gYXJncy5yZWR1Y2UoZnVuY3Rpb24oc3RyLCBhcmcpIHsgcmV0dXJuIHN0ciArIGFyZy5nZXRUeXBlU3RyaW5nKCl9LCBcIlwiKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmZ1bmN0aW9ucy5kZXJpdmVkLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRlcml2ZWRGdW5jdGlvbiA9IHRoaXMuZnVuY3Rpb25zLmRlcml2ZWRbbmFtZV07XG4gICAgICAgICAgICAgICAgaWYgKGRlcml2ZWRGdW5jdGlvbi5oYXNPd25Qcm9wZXJ0eShzaWduYXR1cmUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkZXJpdmVkRnVuY3Rpb25bc2lnbmF0dXJlXS5pbmZvO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmZ1bmN0aW9ucy5vcmlnLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFzdCA9IHRoaXMuZnVuY3Rpb25zLm9yaWdbbmFtZV07XG4gICAgICAgICAgICAgICAgdmFyIHZhcmlhdGlvbnMgPSB0aGlzLmZ1bmN0aW9ucy5kZXJpdmVkW25hbWVdID0gdGhpcy5mdW5jdGlvbnMuZGVyaXZlZFtuYW1lXSB8fCB7fTtcbiAgICAgICAgICAgICAgICB2YXIgZGVyaXZlZCA9IHZhcmlhdGlvbnNbc2lnbmF0dXJlXSA9IHt9O1xuICAgICAgICAgICAgICAgIGRlcml2ZWQuYXN0ID0gdGhpcy5pbmZlckZ1bmN0aW9uKEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoYXN0KSksIGFyZ3MsIGRlZmluaW5nQ29udGV4dCk7XG4gICAgICAgICAgICAgICAgZGVyaXZlZC5pbmZvID0gZGVyaXZlZC5hc3QuZXh0cmEucmV0dXJuSW5mbztcbiAgICAgICAgICAgICAgICBkZXJpdmVkLmluZm8ubmV3TmFtZSA9IG5hbWUucmVwbGFjZSgvXFwuL2csICdfJykgKyBPYmplY3Qua2V5cyh2YXJpYXRpb25zKS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgZGVyaXZlZC5hc3QuaWQubmFtZSA9IGRlcml2ZWQuaW5mby5uZXdOYW1lO1xuICAgICAgICAgICAgICAgIHJldHVybiBkZXJpdmVkLmluZm87XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3QgcmVzb2x2ZSBmdW5jdGlvbiBcIiArIG5hbWUpO1xuICAgICAgICB9XG5cbiAgICB9KTtcblxuXG4gICAgbnMuaW5mZXIgPSBmdW5jdGlvbiAoYXN0LCBvcHQpIHtcbiAgICAgICAgdmFyIHRpID0gbmV3IFR5cGVJbmZlcmVuY2UoYXN0LCBvcHQpO1xuICAgICAgICByZXR1cm4gdGkuaW5mZXJQcm9ncmFtKHRpLnJvb3QsIG9wdC5pbmplY3QpO1xuICAgIH07XG5cblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uL2ludGVyZmFjZXMuanNcIiksXG4gICAgICAgIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXgsXG4gICAgICAgIEJhc2UgPSByZXF1aXJlKFwiLi9pbmRleC5qc1wiKSxcbiAgICAgICAgVHlwZUluZm8gPSByZXF1aXJlKFwiLi90eXBlaW5mby5qc1wiKS5UeXBlSW5mbztcblxuICAgIHZhciBUWVBFUyA9IFNoYWRlLlRZUEVTLFxuICAgICAgICBLSU5EUyA9IFNoYWRlLk9CSkVDVF9LSU5EUztcblxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG5vZGVcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZXh0cmFcbiAgICAgKiBAZXh0ZW5kcyBUeXBlSW5mb1xuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIHZhciBBbm5vdGF0aW9uID0gZnVuY3Rpb24gKG5vZGUsIGV4dHJhKSB7XG4gICAgICAgIFR5cGVJbmZvLmNhbGwodGhpcywgbm9kZSwgZXh0cmEpO1xuICAgIH07XG5cbiAgICBCYXNlLmNyZWF0ZUNsYXNzKEFubm90YXRpb24sIFR5cGVJbmZvLCB7XG5cbiAgICAgICAgc2V0Q2FsbCA6IGZ1bmN0aW9uKGNhbGwpIHtcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcbiAgICAgICAgICAgIGV4dHJhLmV2YWx1YXRlID0gY2FsbDtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0Q2FsbCA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RXh0cmEoKS5ldmFsdWF0ZTtcbiAgICAgICAgfSxcbiAgICAgICAgY2xlYXJDYWxsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcbiAgICAgICAgICAgIGRlbGV0ZSBleHRyYS5ldmFsdWF0ZTtcbiAgICAgICAgfSxcbiAgICAgICAgZWxpbWluYXRlIDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XG4gICAgICAgICAgICBleHRyYS5lbGltaW5hdGUgPSB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICBjYW5FbGltaW5hdGUgOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcbiAgICAgICAgICAgIHJldHVybiBleHRyYS5lbGltaW5hdGUgPT0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge0FycmF5LjxvYmplY3Q+fSBhcnIgQXJyYXkgb2Ygbm9kZXNcbiAgICAgKiBAcGFyYW0ge0NvbnRleHR9IGN0eFxuICAgICAqIEByZXR1cm5zIHtBcnJheS48QW5ub3RhdGlvbj59XG4gICAgICovXG4gICAgQW5ub3RhdGlvbi5jcmVhdGVBbm5vdGF0ZWROb2RlQXJyYXkgPSBmdW5jdGlvbihhcnIsIGN0eCkge1xuICAgICAgICByZXR1cm4gYXJyLm1hcChmdW5jdGlvbiAoYXJnKSB7XG4gICAgICAgICAgICByZXR1cm4gY3R4LmNyZWF0ZVR5cGVJbmZvKGFyZyk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG5vZGVcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZXh0cmFcbiAgICAgKiBAZXh0ZW5kcyBBbm5vdGF0aW9uXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgdmFyIEZ1bmN0aW9uQW5ub3RhdGlvbiA9IGZ1bmN0aW9uIChub2RlLCBleHRyYSkge1xuICAgICAgICBBbm5vdGF0aW9uLmNhbGwodGhpcywgbm9kZSwgZXh0cmEpO1xuICAgICAgICB0aGlzLnNldFR5cGUoVFlQRVMuRlVOQ1RJT04pO1xuICAgIH07XG5cbiAgICBCYXNlLmNyZWF0ZUNsYXNzKEZ1bmN0aW9uQW5ub3RhdGlvbiwgQW5ub3RhdGlvbiwge1xuICAgICAgICBnZXRSZXR1cm5JbmZvOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEV4dHJhKCkucmV0dXJuSW5mbztcbiAgICAgICAgfSxcbiAgICAgICAgc2V0UmV0dXJuSW5mbzogZnVuY3Rpb24oaW5mbykge1xuICAgICAgICAgICAgdGhpcy5nZXRFeHRyYSgpLnJldHVybkluZm8gPSBpbmZvO1xuICAgICAgICB9LFxuICAgICAgICBpc1VzZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhdGhpcy5nZXRFeHRyYSgpLnVzZWQ7XG4gICAgICAgIH0sXG4gICAgICAgIHNldFVzZWQ6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICAgIHRoaXMuZ2V0RXh0cmEoKS51c2VkID0gdjtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgbnMuQW5ub3RhdGlvbiA9IEFubm90YXRpb247XG4gICAgbnMuRnVuY3Rpb25Bbm5vdGF0aW9uID0gRnVuY3Rpb25Bbm5vdGF0aW9uO1xuICAgIG5zLkFOTk8gPSBmdW5jdGlvbihvYmplY3Qpe3JldHVybiBuZXcgQW5ub3RhdGlvbihvYmplY3QpfTtcblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgdmFyIEJhc2UgPSByZXF1aXJlKFwiLi9pbmRleC5qc1wiKSxcbiAgICAgICAgU2hhZGUgPSByZXF1aXJlKFwiLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgVFlQRVMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgQW5ub3RhdGlvbiA9IHJlcXVpcmUoXCIuL2Fubm90YXRpb24uanNcIikuQW5ub3RhdGlvbixcbiAgICAgICAgVHlwZUluZm8gPSByZXF1aXJlKFwiLi90eXBlaW5mby5qc1wiKS5UeXBlSW5mbyxcbiAgICAgICAgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheDtcblxuICAgIG5zLmdldENvbnRleHQgPSBmdW5jdGlvbihyZWdpc3RyeSkge1xuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYmluZGluZ1xuICAgICAqIEBleHRlbmRzIFR5cGVJbmZvXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgdmFyIEJpbmRpbmcgPSBmdW5jdGlvbihiaW5kaW5nLCByZWdpc3RlcnkpIHtcbiAgICAgICAgVHlwZUluZm8uY2FsbCh0aGlzLCBiaW5kaW5nKTtcbiAgICAgICAgaWYodGhpcy5ub2RlLnJlZikge1xuICAgICAgICAgICAgaWYgKCFyZWdpc3RlcnlbdGhpcy5ub2RlLnJlZl0pXG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJObyBvYmplY3QgaGFzIGJlZW4gcmVnaXN0ZXJlZCBmb3I6IFwiICsgdGhpcy5ub2RlLnJlZik7XG4gICAgICAgICAgICB0aGlzLmdsb2JhbE9iamVjdCA9IHJlZ2lzdGVyeVt0aGlzLm5vZGUucmVmXS5vYmplY3Q7XG4gICAgICAgICAgICBpZiAodGhpcy5nbG9iYWxPYmplY3QpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldFR5cGUoVFlQRVMuT0JKRUNUKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIEJhc2UuY3JlYXRlQ2xhc3MoQmluZGluZywgVHlwZUluZm8sIHtcbiAgICAgICAgaGFzQ29uc3RydWN0b3I6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhdGhpcy5nZXRDb25zdHJ1Y3RvcigpO1xuICAgICAgICB9LFxuICAgICAgICBnZXRDb25zdHJ1Y3RvcjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nbG9iYWxPYmplY3QgJiYgdGhpcy5nbG9iYWxPYmplY3QuY29uc3RydWN0b3I7XG4gICAgICAgIH0sXG4gICAgICAgIGlzSW5pdGlhbGl6ZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubm9kZS5pbml0aWFsaXplZDtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0SW5pdGlhbGl6ZWQ6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICAgIHRoaXMubm9kZS5pbml0aWFsaXplZCA9IHY7XG4gICAgICAgIH0sXG4gICAgICAgIGhhc1N0YXRpY1ZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgaXNHbG9iYWw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubm9kZS5pbmZvICYmIHRoaXMubm9kZS5pbmZvLl9nbG9iYWwgfHwgVHlwZUluZm8ucHJvdG90eXBlLmlzR2xvYmFsLmNhbGwodGhpcyk7XG4gICAgICAgIH0sXG4gICAgICAgIGdldFR5cGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2xvYmFsT2JqZWN0PyBUWVBFUy5PQkpFQ1QgOiBUeXBlSW5mby5wcm90b3R5cGUuZ2V0VHlwZS5jYWxsKHRoaXMpO1xuICAgICAgICB9LFxuICAgICAgICBnZXRPYmplY3RJbmZvOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmdsb2JhbE9iamVjdClcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nbG9iYWxPYmplY3Quc3RhdGljO1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNPYmplY3QoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm5vZGUuaW5mbyB8fCByZWdpc3RyeS5nZXRJbnN0YW5jZUZvcktpbmQodGhpcy5nZXRLaW5kKCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0sXG4gICAgICAgIGdldEluZm9Gb3JTaWduYXR1cmU6IGZ1bmN0aW9uKHNpZ25hdHVyZSkge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgaWYoIWV4dHJhLnNpZ25hdHVyZXMpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICByZXR1cm4gZXh0cmEuc2lnbmF0dXJlc1tzaWduYXR1cmVdO1xuICAgICAgICB9LFxuICAgICAgICBzZXRJbmZvRm9yU2lnbmF0dXJlOiBmdW5jdGlvbihzaWduYXR1cmUsIGluZm8pIHtcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcbiAgICAgICAgICAgIGlmKCFleHRyYS5zaWduYXR1cmVzKVxuICAgICAgICAgICAgICAgIGV4dHJhLnNpZ25hdHVyZXMgPSB7fTtcbiAgICAgICAgICAgIHJldHVybiBleHRyYS5zaWduYXR1cmVzW3NpZ25hdHVyZV0gPSBpbmZvO1xuICAgICAgICB9XG5cblxuICAgIH0pXG5cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7Q29udGV4dHxudWxsfSBwYXJlbnRcbiAgICAgKiBAcGFyYW0gb3B0XG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgdmFyIENvbnRleHQgPSBmdW5jdGlvbihub2RlLCBwYXJlbnQsIG9wdCkge1xuICAgICAgICBvcHQgPSBvcHQgfHwge307XG5cbiAgICAgICAgLyoqIEB0eXBlIChDb250ZXh0fG51bGwpICovXG4gICAgICAgIHRoaXMucGFyZW50ID0gcGFyZW50IHx8IG9wdC5wYXJlbnQgfHwgbnVsbDtcbiAgICAgICAgdGhpcy5yZWdpc3RlcnkgPSBwYXJlbnQgPyBwYXJlbnQucmVnaXN0ZXJ5IDoge307XG5cbiAgICAgICAgdGhpcy5jb250ZXh0ID0gbm9kZS5jb250ZXh0ID0gbm9kZS5jb250ZXh0IHx8IHt9O1xuXG4gICAgICAgIC8qKiBAdHlwZSB7T2JqZWN0LjxzdHJpbmcsIHtpbml0aWFsaXplZDogYm9vbGVhbiwgYW5ub3RhdGlvbjogQW5ub3RhdGlvbn0+fSAqL1xuICAgICAgICB0aGlzLmNvbnRleHQuYmluZGluZ3MgPSB0aGlzLmNvbnRleHQuYmluZGluZ3MgfHwge307XG4gICAgICAgIGlmKG9wdC5iaW5kaW5ncykge1xuICAgICAgICAgICAgQmFzZS5leHRlbmQodGhpcy5jb250ZXh0LmJpbmRpbmdzLCBvcHQuYmluZGluZ3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb250ZXh0Lm5hbWUgPSBvcHQubmFtZSB8fCBub2RlLm5hbWUgfHwgXCI8YW5vbnltb3VzPlwiO1xuXG4gICAgfTtcblxuICAgIEJhc2UuZXh0ZW5kKENvbnRleHQucHJvdG90eXBlLCB7XG5cbiAgICAgICAgZ2V0TmFtZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb250ZXh0Lm5hbWU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0QmluZGluZ3M6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29udGV4dC5iaW5kaW5ncztcbiAgICAgICAgfSxcblxuICAgICAgICB1cGRhdGVSZXR1cm5JbmZvOiBmdW5jdGlvbihhbm5vdGF0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLmNvbnRleHQucmV0dXJuSW5mbyA9IGFubm90YXRpb24uZ2V0RXh0cmEoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0UmV0dXJuSW5mbzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb250ZXh0LnJldHVybkluZm87XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gICAgICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0QmluZGluZ0J5TmFtZTogZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAgICAgdmFyIGJpbmRpbmdzID0gdGhpcy5nZXRCaW5kaW5ncygpO1xuICAgICAgICAgICAgdmFyIGJpbmRpbmcgPSBiaW5kaW5nc1tuYW1lXTtcbiAgICAgICAgICAgIGlmKGJpbmRpbmcgIT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEJpbmRpbmcoYmluZGluZywgdGhpcy5yZWdpc3RlcnkpO1xuICAgICAgICAgICAgaWYgKHRoaXMucGFyZW50KVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5nZXRCaW5kaW5nQnlOYW1lKG5hbWUpO1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAgICAgICAgICogQHJldHVybnMge0NvbnRleHR8bnVsbH1cbiAgICAgICAgICovXG4gICAgICAgIGdldENvbnRleHRGb3JOYW1lOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgICAgICB2YXIgYmluZGluZ3MgPSB0aGlzLmdldEJpbmRpbmdzKCk7XG4gICAgICAgICAgICBpZihiaW5kaW5nc1tuYW1lXSAhPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgaWYgKHRoaXMucGFyZW50KVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5nZXRDb250ZXh0Rm9yTmFtZShuYW1lKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFZhcmlhYmxlSWRlbnRpZmllcjogZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLmdldENvbnRleHRGb3JOYW1lKG5hbWUpO1xuICAgICAgICAgICAgaWYoIWNvbnRleHQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICByZXR1cm4gY29udGV4dC5zdHIoKSArIFwiLlwiICsgbmFtZTtcbiAgICAgICAgfSxcblxuICAgICAgICBkZWNsYXJlVmFyaWFibGU6IGZ1bmN0aW9uKG5hbWUsIGZhaWwsIHBvc2l0aW9uKSB7XG4gICAgICAgICAgICB2YXIgYmluZGluZ3MgPSB0aGlzLmdldEJpbmRpbmdzKCk7XG4gICAgICAgICAgICBmYWlsID0gKGZhaWwgPT0gdW5kZWZpbmVkKSA/IHRydWUgOiBmYWlsO1xuICAgICAgICAgICAgaWYgKGJpbmRpbmdzW25hbWVdKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZhaWwpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG5hbWUgKyBcIiB3YXMgYWxyZWFkeSBkZWNsYXJlZCBpbiB0aGlzIHNjb3BlLlwiKVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBpbml0ID0ge1xuICAgICAgICAgICAgICAgIGluaXRpYWxpemVkIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgaW5pdFBvc2l0aW9uOiBwb3NpdGlvbixcbiAgICAgICAgICAgICAgICBleHRyYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5VTkRFRklORURcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYmluZGluZ3NbbmFtZV0gPSBpbml0O1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gICAgICAgICAqIEBwYXJhbSB7VHlwZUluZm99IHR5cGVJbmZvXG4gICAgICAgICAqL1xuICAgICAgICB1cGRhdGVFeHByZXNzaW9uOiBmdW5jdGlvbiAobmFtZSwgdHlwZUluZm8pIHtcbiAgICAgICAgICAgIHZhciB2ID0gdGhpcy5nZXRCaW5kaW5nQnlOYW1lKG5hbWUpO1xuICAgICAgICAgICAgaWYgKCF2KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVmFyaWFibGUgd2FzIG5vdCBkZWNsYXJlZCBpbiB0aGlzIHNjb3BlOiBcIiArIG5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHYuaXNJbml0aWFsaXplZCgpICYmIHYuZ2V0VHlwZSgpICE9PSB0eXBlSW5mby5nZXRUeXBlKCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJWYXJpYWJsZSBtYXkgbm90IGNoYW5nZSBpdCdzIHR5cGU6IFwiICsgbmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXYuaXNJbml0aWFsaXplZCgpKSB7XG4gICAgICAgICAgICAgICAgLy8gQW5ub3RhdGUgdGhlIGRlY2xhcmF0aW9uLCBpZiBvbmUgaXMgZ2l2ZW5cbiAgICAgICAgICAgICAgICBpZih2Lm5vZGUuaW5pdFBvc2l0aW9uKVxuICAgICAgICAgICAgICAgICAgICB2Lm5vZGUuaW5pdFBvc2l0aW9uLmNvcHkodHlwZUluZm8pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2LmNvcHkodHlwZUluZm8pO1xuICAgICAgICAgICAgdi5zZXREeW5hbWljVmFsdWUoKTtcbiAgICAgICAgICAgIHYuc2V0SW5pdGlhbGl6ZWQoIXR5cGVJbmZvLmlzVW5kZWZpbmVkKCkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHJlZ2lzdGVyT2JqZWN0OiBmdW5jdGlvbihuYW1lLCBvYmopIHtcbiAgICAgICAgICAgIHRoaXMucmVnaXN0ZXJ5W29iai5pZF0gPSBvYmo7XG4gICAgICAgICAgICB2YXIgYmluZGluZ3MgPSB0aGlzLmdldEJpbmRpbmdzKCk7XG4gICAgICAgICAgICBiaW5kaW5nc1tuYW1lXSA9IHtcbiAgICAgICAgICAgICAgICBleHRyYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5PQkpFQ1RcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlZjogb2JqLmlkXG4gICAgICAgICAgICB9O1xuICAgICAgICB9LFxuXG4gICAgICAgIGRlY2xhcmVQYXJhbWV0ZXJzOiBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICAgICAgICAgIHZhciBiaW5kaW5ncyA9IHRoaXMuZ2V0QmluZGluZ3MoKTtcbiAgICAgICAgICAgIHRoaXMucGFyYW1zID0gW107XG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgcGFyYW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtZXRlciA9IHBhcmFtc1tpXTtcbiAgICAgICAgICAgICAgICB0aGlzLnBhcmFtc1tpXSA9IHBhcmFtZXRlci5uYW1lO1xuICAgICAgICAgICAgICAgIGJpbmRpbmdzW3BhcmFtZXRlci5uYW1lXSA9IHsgdHlwZTogVFlQRVMuVU5ERUZJTkVEIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXkuPFR5cGVJbmZvPn0gPHBhcmFtc1xuICAgICAgICAgKi9cbiAgICAgICAgaW5qZWN0UGFyYW1ldGVyczogZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpPCBwYXJhbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoaSA9PSB0aGlzLnBhcmFtcy5sZW5ndGgpXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIHZhciBuYW1lID0gdGhpcy5wYXJhbXNbaV07XG4gICAgICAgICAgICAgICAgdmFyIGJpbmRpbmdzID0gdGhpcy5nZXRCaW5kaW5ncygpO1xuICAgICAgICAgICAgICAgIGJpbmRpbmdzW25hbWVdID0geyBleHRyYToge30gfTtcbiAgICAgICAgICAgICAgICBCYXNlLmRlZXBFeHRlbmQoYmluZGluZ3NbbmFtZV0uZXh0cmEsIHBhcmFtc1tpXS5nZXRFeHRyYSgpKTtcbiAgICAgICAgICAgICAgICBpZiAocGFyYW1zW2ldLmdldE5vZGVJbmZvKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgYmluZGluZ3NbbmFtZV0uaW5mbyA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBCYXNlLmRlZXBFeHRlbmQoYmluZGluZ3NbbmFtZV0uaW5mbywgcGFyYW1zW2ldLmdldE5vZGVJbmZvKCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBzdHI6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGN0eCA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgbmFtZXMgPSBbXTtcbiAgICAgICAgICAgIHdoaWxlKGN0eCkge1xuICAgICAgICAgICAgICAgIG5hbWVzLnVuc2hpZnQoY3R4LmdldE5hbWUoKSk7XG4gICAgICAgICAgICAgICAgY3R4ID0gY3R4LnBhcmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBuYW1lcy5qb2luKFwiLlwiKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRBbGxCaW5kaW5nczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gT2JqZWN0LmtleXModGhpcy5nZXRCaW5kaW5ncygpKTtcbiAgICAgICAgICAgIGlmICh0aGlzLnBhcmVudCkge1xuICAgICAgICAgICAgICAgIHZhciBwYXJlbnRCaW5kaW5ncyA9IHRoaXMucGFyZW50LmdldEFsbEJpbmRpbmdzKCk7XG4gICAgICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHBhcmVudEJpbmRpbmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuaW5kZXhPZihwYXJlbnRCaW5kaW5nc1tpXSkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChwYXJlbnRCaW5kaW5nc1tpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gbm9kZVxuICAgICAgICAgKiBAcmV0dXJucyB7VHlwZUluZm99XG4gICAgICAgICAqL1xuICAgICAgICBjcmVhdGVUeXBlSW5mbzogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihub2RlKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQuZ2V0VHlwZSgpICE9PSBUWVBFUy5BTlkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobm9kZS50eXBlID09IFN5bnRheC5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgdmFyIG5hbWUgPSBub2RlLm5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIGJpbmRpbmcgPSB0aGlzLmdldEJpbmRpbmdCeU5hbWUobmFtZSk7XG4gICAgICAgICAgICAgICAgaWYgKCFiaW5kaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJSZWZlcmVuY2VFcnJvcjogXCIgKyBuYW1lICsgXCIgaXMgbm90IGRlZmluZWRcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBiaW5kaW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRPYmplY3RJbmZvRm9yOiBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgICAgIGlmICghb2JqLmlzT2JqZWN0KCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG5cbiAgICAgICAgICAgIC8qIFRoZSBUeXBlSW5mbyBtaWdodCBrbm93IGFib3V0IGl0J3Mgb2JqZWN0IHR5cGUgKi9cbiAgICAgICAgICAgIGlmIChvYmouZ2V0T2JqZWN0SW5mbykge1xuICAgICAgICAgICAgICAgIHJldHVybiBvYmouZ2V0T2JqZWN0SW5mbygpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIG5vZGVJbmZvID0gb2JqLmdldE5vZGVJbmZvKCk7XG4gICAgICAgICAgICBpZiAobm9kZUluZm8pIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRm91bmQgTm9kZUluZm9cIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGVJbmZvO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlZ2lzdHJ5LmdldEluc3RhbmNlRm9yS2luZChvYmouZ2V0S2luZCgpKVxuICAgICAgICB9XG5cbiAgICB9KTtcblxuXG4gICAgICAgIHJldHVybiBDb250ZXh0O1xuXG4gICAgfTtcblxuXG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uKG5zKXtcblxuICAgIG5zLmV4dGVuZCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgZm9yICggdmFyIHByb3AgaW4gYikge1xuICAgICAgICAgICAgdmFyIGcgPSBiLl9fbG9va3VwR2V0dGVyX18ocHJvcCksIHMgPSBiLl9fbG9va3VwU2V0dGVyX18ocHJvcCk7XG4gICAgICAgICAgICBpZiAoZ3x8cykge1xuICAgICAgICAgICAgICAgIGlmIChnKSB7XG4gICAgICAgICAgICAgICAgICAgIGEuX19kZWZpbmVHZXR0ZXJfXyhwcm9wLCBnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgYS5fX2RlZmluZVNldHRlcl9fKHByb3AsIHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGJbcHJvcF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgYVtwcm9wXTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3AgIT09IFwiY29uc3RydWN0b3JcIiB8fCBhICE9PSB3aW5kb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgYVtwcm9wXSA9IGJbcHJvcF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhO1xuICAgIH07XG5cbiAgICBucy5kZWVwRXh0ZW5kID0gZnVuY3Rpb24oZGVzdGluYXRpb24sIHNvdXJjZSkge1xuICAgICAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc291cmNlW3Byb3BlcnR5XSA9PT0gXCJvYmplY3RcIiAmJiBzb3VyY2VbcHJvcGVydHldICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZGVzdGluYXRpb25bcHJvcGVydHldID0gZGVzdGluYXRpb25bcHJvcGVydHldIHx8IHt9O1xuICAgICAgICAgICAgICAgIG5zLmRlZXBFeHRlbmQoZGVzdGluYXRpb25bcHJvcGVydHldLCBzb3VyY2VbcHJvcGVydHldKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGVzdGluYXRpb25bcHJvcGVydHldID0gc291cmNlW3Byb3BlcnR5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjdG9yIENvbnN0cnVjdG9yXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmVudCBQYXJlbnQgY2xhc3NcbiAgICAgKiBAcGFyYW0ge09iamVjdD19IG1ldGhvZHMgTWV0aG9kcyB0byBhZGQgdG8gdGhlIGNsYXNzXG4gICAgICogQHJldHVybiB7T2JqZWN0IX1cbiAgICAgKi9cbiAgICBucy5jcmVhdGVDbGFzcyA9IGZ1bmN0aW9uKGN0b3IsIHBhcmVudCwgbWV0aG9kcykge1xuICAgICAgICBtZXRob2RzID0gbWV0aG9kcyB8fCB7fTtcbiAgICAgICAgaWYgKHBhcmVudCkge1xuICAgICAgICAgICAgLyoqIEBjb25zdHJ1Y3RvciAqL1xuICAgICAgICAgICAgdmFyIEYgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBGLnByb3RvdHlwZSA9IHBhcmVudC5wcm90b3R5cGU7XG4gICAgICAgICAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBGKCk7XG4gICAgICAgICAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3I7XG4gICAgICAgICAgICBjdG9yLnN1cGVyY2xhc3MgPSBwYXJlbnQucHJvdG90eXBlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoIHZhciBtIGluIG1ldGhvZHMpIHtcbiAgICAgICAgICAgIGN0b3IucHJvdG90eXBlW21dID0gbWV0aG9kc1ttXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY3RvcjtcbiAgICB9O1xuXG5cbn0oZXhwb3J0cykpXG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uL2ludGVyZmFjZXMuanNcIiksXG4gICAgICAgIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXgsXG4gICAgICAgIEJhc2UgPSByZXF1aXJlKFwiLi9pbmRleC5qc1wiKTtcblxuICAgIHZhciBUWVBFUyA9IFNoYWRlLlRZUEVTLFxuICAgICAgICBLSU5EUyA9IFNoYWRlLk9CSkVDVF9LSU5EUztcblxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHsqfSBub2RlIENhcnJpZXIgb2JqZWN0IGZvciB0aGUgdHlwZSBpbmZvLCBvbmx5IG5vZGUuZXh0cmEgZ2V0cyBwb2xsdXRlZFxuICAgICAqIEBwYXJhbSB7T2JqZWN0P30gZXh0cmFcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICB2YXIgVHlwZUluZm8gPSBmdW5jdGlvbiAobm9kZSwgZXh0cmEpIHtcbiAgICAgICAgdGhpcy5ub2RlID0gbm9kZTtcbiAgICAgICAgdGhpcy5ub2RlLmV4dHJhID0gdGhpcy5ub2RlLmV4dHJhIHx8IHt9O1xuICAgICAgICBpZiAoZXh0cmEpIHtcbiAgICAgICAgICAgIEJhc2UuZGVlcEV4dGVuZCh0aGlzLm5vZGUuZXh0cmEsIGV4dHJhKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIFR5cGVJbmZvLmNyZWF0ZUZvckNvbnRleHQgPSBmdW5jdGlvbihub2RlLCBjdHgpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBUeXBlSW5mbyhub2RlKTtcbiAgICAgICAgaWYgKHJlc3VsdC5nZXRUeXBlKCkgIT09IFRZUEVTLkFOWSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChub2RlLnR5cGUgPT0gU3ludGF4LklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgIHZhciBuYW1lID0gbm9kZS5uYW1lO1xuICAgICAgICAgICAgdmFyIHZhcmlhYmxlID0gY3R4LmdldEJpbmRpbmdCeU5hbWUobmFtZSk7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFR5cGVJbmZvKG5vZGUsIHZhcmlhYmxlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIFR5cGVJbmZvLnByb3RvdHlwZSA9IHtcbiAgICAgICAgZ2V0RXh0cmE6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm5vZGUuZXh0cmE7XG4gICAgICAgIH0sXG4gICAgICAgIGdldFR5cGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcbiAgICAgICAgICAgIGlmIChleHRyYS50eXBlICE9IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICByZXR1cm4gZXh0cmEudHlwZTtcbiAgICAgICAgICAgIHJldHVybiBUWVBFUy5BTlk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2V0S2luZDogZnVuY3Rpb24gKGtpbmQpIHtcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcbiAgICAgICAgICAgIGV4dHJhLmtpbmQgPSBraW5kO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldEtpbmQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5pc09iamVjdCgpKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RXh0cmEoKS5raW5kIHx8IEtJTkRTLkFOWTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRBcnJheUVsZW1lbnRUeXBlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZighdGhpcy5pc0FycmF5KCkpXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FsbGVkIGdldEFycmF5RWxlbWVudFR5cGUgb24gXCIgKyB0aGlzLmdldFR5cGUoKSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRFeHRyYSgpLmVsZW1lbnRzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzT2ZLaW5kOiBmdW5jdGlvbihraW5kKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuaXNPYmplY3QoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEtpbmQoKSA9PSBraW5kO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZz99IGtpbmRcbiAgICAgICAgICovXG4gICAgICAgIHNldFR5cGU6IGZ1bmN0aW9uICh0eXBlLCBraW5kKSB7XG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XG4gICAgICAgICAgICBleHRyYS50eXBlID0gdHlwZTtcbiAgICAgICAgICAgIGlmIChraW5kKVxuICAgICAgICAgICAgICAgIHRoaXMuc2V0S2luZChraW5kKTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc09mVHlwZTogZnVuY3Rpb24gKHR5cGUpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldFR5cGUoKSA9PSB0eXBlO1xuICAgICAgICB9LFxuXG4gICAgICAgIGVxdWFsczogZnVuY3Rpb24gKG90aGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRUeXBlKCkgPT0gb3RoZXIuZ2V0VHlwZSgpICYmIHRoaXMuZ2V0S2luZCgpID09IG90aGVyLmdldEtpbmQoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc0ludDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNPZlR5cGUoVFlQRVMuSU5UKTtcbiAgICAgICAgfSxcbiAgICAgICAgaXNOdW1iZXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzT2ZUeXBlKFRZUEVTLk5VTUJFUik7XG4gICAgICAgIH0sXG4gICAgICAgIGlzTnVsbE9yVW5kZWZpbmVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc051bGwoKSB8fCB0aGlzLmlzVW5kZWZpbmVkKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGlzTnVsbDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNPZlR5cGUoVFlQRVMuTlVMTCk7XG4gICAgICAgIH0sXG4gICAgICAgIGlzVW5kZWZpbmVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09mVHlwZShUWVBFUy5VTkRFRklORUQpO1xuICAgICAgICB9LFxuICAgICAgICBpc0Jvb2w6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzT2ZUeXBlKFRZUEVTLkJPT0xFQU4pO1xuICAgICAgICB9LFxuICAgICAgICBpc1N0cmluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNPZlR5cGUoVFlQRVMuU1RSSU5HKTtcbiAgICAgICAgfSxcbiAgICAgICAgaXNBcnJheTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNPZlR5cGUoVFlQRVMuQVJSQVkpO1xuICAgICAgICB9LFxuICAgICAgICBpc0Z1bmN0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09mVHlwZShUWVBFUy5GVU5DVElPTik7XG4gICAgICAgIH0sXG4gICAgICAgIGlzT2JqZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09mVHlwZShUWVBFUy5PQkpFQ1QpO1xuICAgICAgICB9LFxuICAgICAgICBpc0dsb2JhbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gISF0aGlzLmdldEV4dHJhKCkuZ2xvYmFsO1xuICAgICAgICB9LFxuICAgICAgICBzZXRHbG9iYWw6IGZ1bmN0aW9uIChnbG9iYWwpIHtcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcbiAgICAgICAgICAgIGV4dHJhLmdsb2JhbCA9IGdsb2JhbDtcbiAgICAgICAgfSxcbiAgICAgICAgY2FuTnVtYmVyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc051bWJlcigpIHx8IHRoaXMuaXNJbnQoKSB8fCB0aGlzLmlzQm9vbCgpO1xuICAgICAgICB9LFxuICAgICAgICBjYW5JbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzSW50KCkgfHwgdGhpcy5pc0Jvb2woKTtcbiAgICAgICAgfSxcbiAgICAgICAgaGFzU3RhdGljVmFsdWUgOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzTnVsbE9yVW5kZWZpbmVkKCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICByZXR1cm4gZXh0cmEuaGFzT3duUHJvcGVydHkoXCJzdGF0aWNWYWx1ZVwiKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0U3RhdGljVmFsdWUgOiBmdW5jdGlvbih2KSB7XG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XG4gICAgICAgICAgICBpZiAodGhpcy5pc051bGxPclVuZGVmaW5lZCgpKVxuICAgICAgICAgICAgICAgIHRocm93KFwiTnVsbCBhbmQgdW5kZWZpbmVkIGhhdmUgcHJlZGVmaW5lZCB2YWx1ZXMuXCIpO1xuICAgICAgICAgICAgZXh0cmEuc3RhdGljVmFsdWUgPSB2O1xuICAgICAgICB9LFxuICAgICAgICBnZXRTdGF0aWNWYWx1ZSA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmhhc1N0YXRpY1ZhbHVlKCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb2RlIGhhcyBubyBzdGF0aWMgdmFsdWU6IFwiICsgdGhpcy5ub2RlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmlzTnVsbCgpKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNVbmRlZmluZWQoKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RXh0cmEoKS5zdGF0aWNWYWx1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0RHluYW1pY1ZhbHVlIDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5nZXRFeHRyYSgpLnN0YXRpY1ZhbHVlO1xuICAgICAgICB9LFxuICAgICAgICBzZXRDYWxsIDogZnVuY3Rpb24oY2FsbCkge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgZXh0cmEuZXZhbHVhdGUgPSBjYWxsO1xuICAgICAgICB9LFxuICAgICAgICBnZXRDYWxsIDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRFeHRyYSgpLmV2YWx1YXRlO1xuICAgICAgICB9LFxuICAgICAgICBjbGVhckNhbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgZGVsZXRlIGV4dHJhLmV2YWx1YXRlO1xuICAgICAgICB9LFxuICAgICAgICBjb3B5OiBmdW5jdGlvbihvdGhlcikge1xuICAgICAgICAgICAgQmFzZS5kZWVwRXh0ZW5kKHRoaXMubm9kZS5leHRyYSwgb3RoZXIuZ2V0RXh0cmEoKSk7XG4gICAgICAgIH0sXG4gICAgICAgIHN0cjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XG4gICAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoZXh0cmEsIG51bGwsIDEpO1xuICAgICAgICB9LFxuICAgICAgICBjYW5Ob3JtYWw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNPYmplY3QoKSAmJiAodGhpcy5pc09mS2luZChLSU5EUy5OT1JNQUwpIHx8IHRoaXMuaXNPZktpbmQoS0lORFMuRkxPQVQzKSk7XG4gICAgICAgIH0sXG4gICAgICAgIGNhbkNvbG9yOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzT2JqZWN0KCkgJiYgKHRoaXMuaXNPZktpbmQoS0lORFMuRkxPQVQ0KSB8fCB0aGlzLmlzT2ZLaW5kKEtJTkRTLkZMT0FUMykpO1xuICAgICAgICB9LFxuICAgICAgICBlbGltaW5hdGUgOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcbiAgICAgICAgICAgIGV4dHJhLmVsaW1pbmF0ZSA9IHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIGNhbkVsaW1pbmF0ZSA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgcmV0dXJuIGV4dHJhLmVsaW1pbmF0ZSA9PSB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICBzZXRGcm9tRXh0cmE6IGZ1bmN0aW9uKGV4dHJhKXtcbiAgICAgICAgICAgIHRoaXMuc2V0VHlwZShleHRyYS50eXBlKTtcbiAgICAgICAgICAgIGlmIChleHRyYS5raW5kICE9IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICB0aGlzLnNldEtpbmQoZXh0cmEua2luZCk7XG4gICAgICAgICAgICB0aGlzLnNldEdsb2JhbChleHRyYS5nbG9iYWwpO1xuICAgICAgICAgICAgaWYgKGV4dHJhLnN0YXRpY1ZhbHVlICE9IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRpY1ZhbHVlKGV4dHJhLnN0YXRpY1ZhbHVlKTtcbiAgICAgICAgICAgIGlmIChleHRyYS5ldmFsdWF0ZSAhPSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRDYWxsKGV4dHJhLmV2YWx1YXRlKTtcbiAgICAgICAgICAgIGlmIChleHRyYS5zb3VyY2UgIT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIHRoaXMuc2V0U291cmNlKGV4dHJhLnNvdXJjZSk7XG4gICAgICAgIH0sXG4gICAgICAgIGdldE5vZGVJbmZvOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzT2JqZWN0KCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubm9kZS5pbmZvO1xuICAgICAgICB9LFxuICAgICAgICBnZXRUeXBlU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzT2JqZWN0KCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiT2JqZWN0ICM8XCIgKyB0aGlzLmdldEtpbmQoKSArIFwiPlwiO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VHlwZSgpO1xuICAgICAgICB9LFxuICAgICAgICBzZXRTb3VyY2U6IGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgZXh0cmEuc291cmNlID0gc291cmNlO1xuICAgICAgICB9LFxuICAgICAgICBnZXRTb3VyY2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RXh0cmEoKS5zb3VyY2U7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIG5zLlR5cGVJbmZvID0gVHlwZUluZm87XG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uKG5zKXtcblxuICAgIG5zLnN3aXp6bGVUb0luZGV4ID0gZnVuY3Rpb24oc3dpenpsZUtleSl7XG4gICAgICAgIHN3aXRjaChzd2l6emxlS2V5KXtcbiAgICAgICAgICAgIGNhc2UgJ3gnOmNhc2UgJ3InIDpjYXNlICdzJzogcmV0dXJuIDA7XG4gICAgICAgICAgICBjYXNlICd5JzpjYXNlICdnJyA6Y2FzZSAndCc6IHJldHVybiAxO1xuICAgICAgICAgICAgY2FzZSAneic6Y2FzZSAnYicgOmNhc2UgJ3AnOiByZXR1cm4gMjtcbiAgICAgICAgICAgIGNhc2UgJ3cnOmNhc2UgJ2EnIDpjYXNlICdxJzogcmV0dXJuIDM7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biBzd2l6emxlIGtleTogJ1wiICsgc3dpenpsZUtleSArIFwiJ1wiKTtcbiAgICB9O1xuICAgIG5zLmluZGV4VG9Td2l6emxlID0gZnVuY3Rpb24oaW5kZXgpe1xuICAgICAgICBzd2l0Y2goaW5kZXgpe1xuICAgICAgICAgICAgY2FzZSAwOiByZXR1cm4gJ3gnO1xuICAgICAgICAgICAgY2FzZSAxOiByZXR1cm4gJ3knO1xuICAgICAgICAgICAgY2FzZSAyOiByZXR1cm4gJ3onO1xuICAgICAgICAgICAgY2FzZSAzOiByZXR1cm4gJ3cnO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVua25vd24gc3dpenpsZSBpbmRleDogJ1wiICsgaW5kZXggKyBcIidcIik7XG4gICAgfTtcbiAgICBucy5zd2l6emxlU2V0cyA9IFtcbiAgICAgICAgWyd4JywgJ3knLCAneicsICd3J10sXG4gICAgICAgIFsncicsICdnJywgJ2InLCAnYSddLFxuICAgICAgICBbJ3MnLCAndCcsICdwJywgJ3EnXVxuICAgIF07XG5cbn0oZXhwb3J0cykpXG4iLCIoZnVuY3Rpb24gKG5zKSB7XG5cbiAgICB2YXIgQmFzZSA9IHJlcXVpcmUoXCIuLi8uLi9iYXNlL2luZGV4LmpzXCIpO1xuXG4gICAgdmFyIFRyYW5zZm9ybWVyID0gcmVxdWlyZShcIi4vdHJhbnNmb3JtLmpzXCIpLkdMQVNUVHJhbnNmb3JtZXI7XG4gICAgdmFyIGdlbmVyYXRlID0gcmVxdWlyZShcIi4vZ2xzbC1nZW5lcmF0ZS5qc1wiKS5nZW5lcmF0ZTtcblxuICAgIHZhciBHTFNMQ29tcGlsZXIgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICB9O1xuXG4gICAgQmFzZS5leHRlbmQoR0xTTENvbXBpbGVyLnByb3RvdHlwZSwge1xuXG4gICAgICAgIGNvbXBpbGVGcmFnbWVudFNoYWRlcjogZnVuY3Rpb24gKGFhc3QsIG9wdCkge1xuXG4gICAgICAgICAgICB2YXIgdHJhbnNmb3JtZXIgPSBuZXcgVHJhbnNmb3JtZXIoXCJnbG9iYWwuc2hhZGVcIik7XG5cbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYWFzdCwgMCwgXCIgXCIpKTtcblxuICAgICAgICAgICAgdmFyIHRyYW5zZm9ybWVkID0gdHJhbnNmb3JtZXIudHJhbnNmb3JtQUFTVChhYXN0KTtcblxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhYXN0LCAwLCBcIiBcIikpO1xuXG4gICAgICAgICAgICB2YXIgY29kZSA9IGdlbmVyYXRlKHRyYW5zZm9ybWVkLCBvcHQpO1xuXG4gICAgICAgICAgICByZXR1cm4gY29kZTtcbiAgICAgICAgfVxuXG4gICAgfSk7XG5cblxuICAgIG5zLkdMU0xDb21waWxlciA9IEdMU0xDb21waWxlcjtcblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24gKG5zKSB7XG5cbiAgICB2YXIgRnVuY3Rpb25Bbm5vdGF0aW9uID0gcmVxdWlyZShcIi4vLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkZ1bmN0aW9uQW5ub3RhdGlvbjtcbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpO1xuICAgIHZhciB3YWxrID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLFxuICAgICAgICBTeW50YXggPSB3YWxrLlN5bnRheCxcbiAgICAgICAgVmlzaXRvck9wdGlvbiA9IHdhbGsuVmlzaXRvck9wdGlvbjtcblxuICAgIHZhciBUeXBlcyA9IFNoYWRlLlRZUEVTLFxuICAgICAgICBLaW5kcyA9IFNoYWRlLk9CSkVDVF9LSU5EUyxcbiAgICAgICAgU291cmNlcyA9IFNoYWRlLlNPVVJDRVM7XG5cblxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdFxuICAgICAqL1xuICAgIHZhciBnZXRIZWFkZXIgPSBmdW5jdGlvbiAob3B0KSB7XG4gICAgICAgIGlmIChvcHQub21pdEhlYWRlciA9PSB0cnVlKVxuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB2YXIgaGVhZGVyID0gW1xuICAgICAgICAgICAgXCIvLyBHZW5lcmF0ZWQgYnkgc2hhZGUuanNcIlxuICAgICAgICBdO1xuICAgICAgICB2YXIgZmxvYXRQcmVjaXNpb24gPSBvcHQuZmxvYXRQcmVjaXNpb24gfHwgXCJtZWRpdW1wXCI7XG4gICAgICAgIGhlYWRlci5wdXNoKFwicHJlY2lzaW9uIFwiICsgZmxvYXRQcmVjaXNpb24gKyBcIiBmbG9hdDtcIik7XG4gICAgICAgIHJldHVybiBoZWFkZXI7XG4gICAgfVxuXG4gICAgdmFyIHRvR0xTTFR5cGUgPSBmdW5jdGlvbiAoaW5mbywgYWxsb3dVbmRlZmluZWQpIHtcbiAgICAgICAgc3dpdGNoIChpbmZvLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgVHlwZXMuT0JKRUNUOlxuICAgICAgICAgICAgICAgIHN3aXRjaCAoaW5mby5raW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS2luZHMuRkxPQVQ0OlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwidmVjNFwiO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIEtpbmRzLkZMT0FUMzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcInZlYzNcIjtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLaW5kcy5GTE9BVDI6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJ2ZWMyXCI7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCI8dW5kZWZpbmVkPlwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgVHlwZXMuVU5ERUZJTkVEOlxuICAgICAgICAgICAgICAgIGlmIChhbGxvd1VuZGVmaW5lZClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwidm9pZFwiO1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBkZXRlcm1pbmUgdHlwZVwiKTtcbiAgICAgICAgICAgIGNhc2UgVHlwZXMuTlVNQkVSOlxuICAgICAgICAgICAgICAgIHJldHVybiBcImZsb2F0XCI7XG4gICAgICAgICAgICBjYXNlIFR5cGVzLkJPT0xFQU46XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiYm9vbFwiO1xuICAgICAgICAgICAgY2FzZSBUeXBlcy5JTlQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiaW50XCI7XG4gICAgICAgICAgICBjYXNlIFR5cGVzLkJPT0xFQU46XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiYm9vbFwiO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ0b0dMU0xUeXBlOiBVbmhhbmRsZWQgdHlwZTogXCIgKyBpbmZvLnR5cGUpO1xuXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgdG9HTFNMU291cmNlID0gZnVuY3Rpb24oaW5mbykge1xuICAgICAgICBpZiAoIWluZm8uc291cmNlKVxuICAgICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgIGlmIChpbmZvLnNvdXJjZSA9PSBTb3VyY2VzLlZFUlRFWClcbiAgICAgICAgICAgIHJldHVybiBcInZhcnlpbmdcIjtcbiAgICAgICAgaWYgKGluZm8uc291cmNlID09IFNvdXJjZXMuVU5JRk9STSlcbiAgICAgICAgICAgIHJldHVybiBcInVuaWZvcm1cIjtcbiAgICAgICAgaWYgKGluZm8uc291cmNlID09IFNvdXJjZXMuQ09OU1RBTlQpXG4gICAgICAgICAgICByZXR1cm4gXCJjb25zdFwiO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ0b0dMU0xTb3VyY2U6IFVuaGFuZGxlZCB0eXBlOiBcIiArIGluZm8uc291cmNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVMaW5lU3RhY2soKSB7XG4gICAgICAgIHZhciBhcnIgPSBbXTtcbiAgICAgICAgYXJyLnB1c2guYXBwbHkoYXJyLCBhcmd1bWVudHMpO1xuICAgICAgICB2YXIgaW5kZW50ID0gXCJcIjtcbiAgICAgICAgYXJyLmFwcGVuZExpbmUgPSBmdW5jdGlvbihsaW5lKXtcbiAgICAgICAgICAgIHRoaXMucHVzaChpbmRlbnQgKyBsaW5lKTtcbiAgICAgICAgfTtcbiAgICAgICAgYXJyLmNoYW5nZUluZGVudGlvbiA9IGZ1bmN0aW9uKGFkZCl7XG4gICAgICAgICAgICB3aGlsZShhZGQgPiAwKXtcbiAgICAgICAgICAgICAgICBpbmRlbnQgKz0gXCIgICAgXCI7IGFkZC0tO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYoYWRkIDwgMCl7XG4gICAgICAgICAgICAgICAgaW5kZW50ID0gaW5kZW50LnN1YnN0cigwLCBpbmRlbnQubGVuZ3RoICsgYWRkKjQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBhcnIuYXBwZW5kID0gZnVuY3Rpb24oc3RyKXtcbiAgICAgICAgICAgIHRoaXNbdGhpcy5sZW5ndGgtMV0gPSB0aGlzW3RoaXMubGVuZ3RoLTFdICsgc3RyO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gYXJyO1xuICAgIH07XG5cblxuICAgIC8qQmFzZS5leHRlbmQoTGluZVN0YWNrLnByb3RvdHlwZSwge1xuXG4gICAgfSk7Ki9cblxuICAgIHZhciBnZW5lcmF0ZSA9IGZ1bmN0aW9uIChhc3QsIG9wdCkge1xuXG4gICAgICAgIG9wdCA9IG9wdCB8fCB7fTtcblxuICAgICAgICB2YXIgaW5kZW50ID0gXCJcIjtcbiAgICAgICAgdmFyIGxpbmVzID0gY3JlYXRlTGluZVN0YWNrKCk7XG5cbiAgICAgICAgdHJhdmVyc2UoYXN0LCBsaW5lcywgb3B0KTtcblxuICAgICAgICByZXR1cm4gbGluZXMuam9pbihcIlxcblwiKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0cmF2ZXJzZShhc3QsIGxpbmVzLCBvcHQpIHtcbiAgICAgICAgd2Fsay50cmF2ZXJzZShhc3QsIHtcbiAgICAgICAgICAgICAgICBlbnRlcjogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0eXBlID0gbm9kZS50eXBlO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoICh0eXBlKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Qcm9ncmFtOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZXRIZWFkZXIob3B0KS5mb3JFYWNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5wdXNoKGUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZ1bmMgPSBuZXcgRnVuY3Rpb25Bbm5vdGF0aW9uKG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWV0aG9kU3RhcnQgPSBbdG9HTFNMVHlwZShmdW5jLmdldFJldHVybkluZm8oKSwgdHJ1ZSldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRob2RTdGFydC5wdXNoKG5vZGUuaWQubmFtZSwgJygnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEobm9kZS5wYXJhbXMgJiYgbm9kZS5wYXJhbXMubGVuZ3RoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kU3RhcnQucHVzaChcInZvaWRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLnBhcmFtcy5mb3JFYWNoKGZ1bmN0aW9uIChwYXJhbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZFN0YXJ0LnB1c2godG9HTFNMVHlwZShwYXJhbS5leHRyYSksIHBhcmFtLm5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRob2RTdGFydC5wdXNoKCcpIHsnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuYXBwZW5kTGluZShtZXRob2RTdGFydC5qb2luKFwiIFwiKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmNoYW5nZUluZGVudGlvbigxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5SZXR1cm5TdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBoYXNBcmd1bWVudHMgPSBub2RlLmFyZ3VtZW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5hcHBlbmRMaW5lKFwicmV0dXJuIFwiICsgKGhhc0FyZ3VtZW50cyA/IGhhbmRsZUV4cHJlc3Npb24obm9kZS5hcmd1bWVudCkgOiBcIlwiKSArIFwiO1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguVmFyaWFibGVEZWNsYXJhdG9yIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJNZWVwIVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNvdXJjZSA9IHRvR0xTTFNvdXJjZShub2RlLmV4dHJhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxpbmUgPSBzb3VyY2UgPyBzb3VyY2UgKyBcIiBcIiA6IFwiXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmUgKz0gdG9HTFNMVHlwZShub2RlLmV4dHJhKSArIFwiIFwiICsgbm9kZS5pZC5uYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5pbml0KSBsaW5lICs9IFwiID0gXCIgKyBoYW5kbGVFeHByZXNzaW9uKG5vZGUuaW5pdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmFwcGVuZExpbmUobGluZSArIFwiO1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQXNzaWdubWVudEV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmFwcGVuZExpbmUoaGFuZGxlRXhwcmVzc2lvbihub2RlKSArIFwiO1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5FeHByZXNzaW9uU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5hcHBlbmRMaW5lKGhhbmRsZUV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uKSArIFwiO1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFZpc2l0b3JPcHRpb24uU2tpcDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LklmU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5hcHBlbmRMaW5lKFwiaWYoXCIgKyBoYW5kbGVFeHByZXNzaW9uKG5vZGUudGVzdCkgKyBcIikge1wiKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5jaGFuZ2VJbmRlbnRpb24oMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYXZlcnNlKG5vZGUuY29uc2VxdWVudCwgbGluZXMsIG9wdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmNoYW5nZUluZGVudGlvbigtMSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUuYWx0ZXJuYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5hcHBlbmRMaW5lKFwifSBlbHNlIHtcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5jaGFuZ2VJbmRlbnRpb24oMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmF2ZXJzZShub2RlLmFsdGVybmF0ZSwgbGluZXMsIG9wdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5jaGFuZ2VJbmRlbnRpb24oLTEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmFwcGVuZExpbmUoXCJ9XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gVmlzaXRvck9wdGlvbi5Ta2lwO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJVbmhhbmRsZWQ6IFwiICsgdHlwZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBlLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBsZWF2ZTogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHR5cGUgPSBub2RlLnR5cGU7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguUHJvZ3JhbTpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb246XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuY2hhbmdlSW5kZW50aW9uKC0xKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5hcHBlbmRMaW5lKFwifVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICB2YXIgZ2VuZXJhdGVGbG9hdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGlmKGlzTmFOKHZhbHVlKSlcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiSW50ZXJuYWw6IEV4cHJlc3Npb24gZ2VuZXJhdGVkIE5hTiFcIik7XG4gICAgICAgIHZhciByZXN1bHQgPSAnJyArIHZhbHVlO1xuICAgICAgICBpZiAocmVzdWx0LmluZGV4T2YoXCIuXCIpID09IC0xKSB7XG4gICAgICAgICAgICByZXN1bHQgKz0gXCIuMFwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm9kZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICovXG4gICAgdmFyIGhhbmRsZUV4cHJlc3Npb24gPSBmdW5jdGlvbihub2RlKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBcIjx1bmhhbmRsZWQ6IFwiICsgbm9kZS50eXBlKyBcIj5cIjtcbiAgICAgICAgc3dpdGNoKG5vZGUudHlwZSkge1xuICAgICAgICAgICAgY2FzZSBTeW50YXguTmV3RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICByZXN1bHQgPSB0b0dMU0xUeXBlKG5vZGUuZXh0cmEpO1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBoYW5kbGVBcmd1bWVudHMobm9kZS5hcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5MaXRlcmFsOlxuICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IG5vZGUuZXh0cmEuc3RhdGljVmFsdWUgIT09IHVuZGVmaW5lZCA/IG5vZGUuZXh0cmEuc3RhdGljVmFsdWUgOiBub2RlLnZhbHVlO1xuICAgICAgICAgICAgICAgIGlmIChub2RlLmV4dHJhLnR5cGUgPT0gVHlwZXMuTlVNQkVSKVxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBnZW5lcmF0ZUZsb2F0KHZhbHVlKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG5cbiAgICAgICAgICAgIGNhc2UgU3ludGF4LklkZW50aWZpZXI6XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gbm9kZS5uYW1lO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5CaW5hcnlFeHByZXNzaW9uOlxuICAgICAgICAgICAgY2FzZSBTeW50YXguTG9naWNhbEV4cHJlc3Npb246XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Bc3NpZ25tZW50RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBoYW5kbGVCaW5hcnlBcmd1bWVudChub2RlLmxlZnQpO1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBcIiBcIiArIG5vZGUub3BlcmF0b3IgKyBcIiBcIjtcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gaGFuZGxlQmluYXJ5QXJndW1lbnQobm9kZS5yaWdodCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5VbmFyeUV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gbm9kZS5vcGVyYXRvcjtcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gaGFuZGxlQmluYXJ5QXJndW1lbnQobm9kZS5hcmd1bWVudCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkNhbGxFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGhhbmRsZUV4cHJlc3Npb24obm9kZS5jYWxsZWUpO1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBoYW5kbGVBcmd1bWVudHMobm9kZS5hcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5NZW1iZXJFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGhhbmRsZUV4cHJlc3Npb24obm9kZS5vYmplY3QpO1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBcIi5cIjtcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gaGFuZGxlRXhwcmVzc2lvbihub2RlLnByb3BlcnR5KTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBTeW50YXguQ29uZGl0aW9uYWxFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGhhbmRsZUV4cHJlc3Npb24obm9kZS50ZXN0KTtcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gXCIgPyBcIjtcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gaGFuZGxlRXhwcmVzc2lvbihub2RlLmNvbnNlcXVlbnQpO1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBcIiA6IFwiO1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBoYW5kbGVFeHByZXNzaW9uKG5vZGUuYWx0ZXJuYXRlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiVW5oYW5kbGVkOiBcIiAsIG5vZGUudHlwZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBoYW5kbGVCaW5hcnlBcmd1bWVudChub2RlKXtcbiAgICAgICAgdmFyIHJlc3VsdCA9IGhhbmRsZUV4cHJlc3Npb24obm9kZSk7XG4gICAgICAgIHN3aXRjaChub2RlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkJpbmFyeUV4cHJlc3Npb246XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Mb2dpY2FsRXhwcmVzc2lvbjpcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkFzc2lnbm1lbnRFeHByZXNzaW9uOiByZXN1bHQgPSBcIiggXCIgKyByZXN1bHQgKyBcIiApXCI7IGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaGFuZGxlQXJndW1lbnRzKGNvbnRhaW5lcikge1xuICAgICAgICB2YXIgcmVzdWx0ID0gXCIoXCI7XG4gICAgICAgIGNvbnRhaW5lci5mb3JFYWNoKGZ1bmN0aW9uIChhcmcsIGluZGV4KSB7XG4gICAgICAgICAgICByZXN1bHQgKz0gaGFuZGxlRXhwcmVzc2lvbihhcmcpO1xuICAgICAgICAgICAgaWYgKGluZGV4IDwgY29udGFpbmVyLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gXCIsIFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdCArIFwiKVwiO1xuICAgIH1cblxuXG4gICAgZXhwb3J0cy5nZW5lcmF0ZSA9IGdlbmVyYXRlO1xuXG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uKG5zKXtcblxuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpO1xuICAgIHZhciBUb29scyA9IHJlcXVpcmUoXCIuL3Rvb2xzLmpzXCIpO1xuXG4gICAgdmFyIENvbG9yQ2xvc3VyZUluc3RhbmNlID0ge1xuXG4gICAgfTtcblxuICAgIFRvb2xzLmV4dGVuZChucywge1xuICAgICAgICBpZDogXCJDb2xvckNsb3N1cmVcIixcbiAgICAgICAga2luZDogU2hhZGUuT0JKRUNUX0tJTkRTLkNPTE9SX0NMT1NVUkUsXG4gICAgICAgIG9iamVjdDoge1xuICAgICAgICAgICAgY29uc3RydWN0b3I6IG51bGwsXG4gICAgICAgICAgICBzdGF0aWM6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIGluc3RhbmNlOiBDb2xvckNsb3N1cmVJbnN0YW5jZVxuICAgIH0pO1xufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpIHtcblxuICAgIHZhciBvYmplY3RzID0ge1xuICAgICAgICAvL0NvbG9yIDogcmVxdWlyZShcIi4vY29sb3IuanNcIiksXG4gICAgICAgIFNoYWRlIDogcmVxdWlyZShcIi4vc2hhZGUuanNcIiksXG4gICAgICAgIC8vTWF0cml4NCA6IHJlcXVpcmUoXCIuL21hdHJpeC5qc1wiKSxcbiAgICAgICAgTWF0aCA6IHJlcXVpcmUoXCIuL21hdGguanNcIiksXG4gICAgICAgIFN5c3RlbSA6IHJlcXVpcmUoXCIuL3N5c3RlbS5qc1wiKSxcbiAgICAgICAgVmVjMiA6IHJlcXVpcmUoXCIuL3ZlYzIuanNcIiksXG4gICAgICAgIFZlYzMgOiByZXF1aXJlKFwiLi92ZWMzLmpzXCIpLFxuICAgICAgICBDb2xvcjogcmVxdWlyZShcIi4vdmVjMy5qc1wiKSxcbiAgICAgICAgVmVjNCA6IHJlcXVpcmUoXCIuL3ZlYzQuanNcIiksXG4gICAgICAgIENvbG9yQ2xvc3VyZTogcmVxdWlyZShcIi4vY29sb3JjbG9zdXJlLmpzXCIpXG4gICAgfTtcblxuICAgIG5zLlJlZ2lzdHJ5ID0ge1xuICAgICAgICBuYW1lOiBcIkdMU0xUcmFuc2Zvcm1SZWdpc3RyeVwiLFxuICAgICAgICBnZXRCeU5hbWU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBvYmplY3RzW25hbWVdO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCBudWxsO1xuICAgICAgICB9LFxuICAgICAgICBnZXRJbnN0YW5jZUZvcktpbmQ6IGZ1bmN0aW9uKGtpbmQpIHtcbiAgICAgICAgICAgIGZvcih2YXIgb2JqIGluIG9iamVjdHMpIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0c1tvYmpdLmtpbmQgPT0ga2luZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2JqZWN0c1tvYmpdLmluc3RhbmNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uKG5zKXtcblxuICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIik7XG4gICB2YXIgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheDtcbiAgIHZhciBUb29scyA9IHJlcXVpcmUoJy4vdG9vbHMuanMnKTtcblxuICAgIHZhciBNYXRoQ29uc3RhbnRzID0gW1wiRVwiLCBcIlBJXCIsIFwiTE4yXCIsIFwiTE9HMkVcIiwgXCJMT0cxMEVcIiwgXCJQSVwiLCBcIlNRUlQxXzJcIiwgXCJTUVJUMlwiXTtcblxuXG5cbiAgICB2YXIgaGFuZGxlSW50VmVyc2lvbiA9IGZ1bmN0aW9uKG5vZGUsIHBhcmVudCkge1xuICAgICAgICBwYXJlbnQuZXh0cmEudHlwZSA9IFNoYWRlLlRZUEVTLk5VTUJFUjtcbiAgICAgICAgcmV0dXJuIFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uKG5vZGUpO1xuICAgIH1cblxuXG4gICAgdmFyIE1hdGhFbnRyeSAgPSB7XG4gICAgICAgIGFiczogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcbiAgICAgICAgYWNvczogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcbiAgICAgICAgYXNpbjogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcbiAgICAgICAgYXRhbjogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcbiAgICAgICAgYXRhbjI6IHsgcHJvcGVydHk6IGZ1bmN0aW9uKCkgeyByZXR1cm4geyB0eXBlOiBTeW50YXguSWRlbnRpZmllciwgbmFtZTogXCJhdGFuXCIgfSB9fSxcbiAgICAgICAgY2VpbDogeyBwcm9wZXJ0eTogaGFuZGxlSW50VmVyc2lvbiB9LFxuICAgICAgICBjb3M6ICB7IHByb3BlcnR5OiBUb29scy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiB9LFxuICAgICAgICBleHA6IHsgcHJvcGVydHk6IFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uIH0sXG4gICAgICAgIGZsb29yOiB7IHByb3BlcnR5OiBoYW5kbGVJbnRWZXJzaW9uIH0sXG4gICAgICAgIC8vIGltdWw6IHsgcHJvcGVydHk6IFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uIH0sXG4gICAgICAgIGxvZzogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcbiAgICAgICAgbWF4OiB7IHByb3BlcnR5OiBUb29scy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiB9LFxuICAgICAgICBtaW46IHsgcHJvcGVydHk6IFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uIH0sXG4gICAgICAgIHBvdzogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcbiAgICAgICAgLy8gcmFuZG9tOiBmdW5jdGlvbiByYW5kb20oKSB7IFtuYXRpdmUgY29kZV0gfVxuICAgICAgICByb3VuZDogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSwgLy8gU2luY2UgR0xTTCAxLjMsIHdoYXQgZG9lcyBXZWJHTCB1c2U/XG4gICAgICAgIHNpbjogIHsgcHJvcGVydHk6IFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uIH0sXG4gICAgICAgIHNxcnQ6IHsgcHJvcGVydHk6IFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uIH0sXG4gICAgICAgIHRhbjogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfVxuICAgIH07XG5cbiAgICBNYXRoQ29uc3RhbnRzLmZvckVhY2goZnVuY3Rpb24gKGNvbnN0YW50KSB7XG4gICAgICAgIE1hdGhFbnRyeVtjb25zdGFudF0gPSB7XG4gICAgICAgICAgICBwcm9wZXJ0eTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAgeyB0eXBlOiBTeW50YXguTGl0ZXJhbCwgdmFsdWU6IE1hdGhbY29uc3RhbnRdLCBleHRyYTogeyB0eXBlOiBTaGFkZS5UWVBFUy5OVU1CRVIgfSB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBUb29scy5leHRlbmQobnMsIHtcbiAgICAgICAgaWQ6IFwiTWF0aFwiLFxuICAgICAgICBvYmplY3Q6IHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBudWxsLFxuICAgICAgICAgICAgc3RhdGljOiBNYXRoRW50cnlcbiAgICAgICAgfSxcbiAgICAgICAgaW5zdGFuY2U6IE1hdGhFbnRyeVxuICAgIH0pO1xuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucyl7XG5cbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKTtcbiAgICB2YXIgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheDtcbiAgICB2YXIgVG9vbHMgPSByZXF1aXJlKCcuL3Rvb2xzLmpzJyk7XG5cbiAgICB2YXIgU2hhZGVPYmplY3QgPSB7XG4gICAgICAgIGRpZmZ1c2U6IHt9LFxuICAgICAgICBwaG9uZzoge30sXG4gICAgICAgIGZyYWN0OiB7IHByb3BlcnR5OiBUb29scy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiB9LFxuICAgICAgICBjbGFtcDogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcbiAgICAgICAgc3RlcDogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcbiAgICAgICAgc21vb3Roc3RlcDogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfVxuICAgIH1cblxuICAgIFRvb2xzLmV4dGVuZChucywge1xuICAgIGlkOiBcIlNoYWRlXCIsXG4gICAgb2JqZWN0OiB7XG4gICAgICAgIGNvbnN0cnVjdG9yOiBudWxsLFxuICAgICAgICBzdGF0aWM6IFNoYWRlT2JqZWN0XG4gICAgfSxcbiAgICBpbnN0YW5jZTogbnVsbFxufSk7XG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uIChucykge1xuXG4gICAgdmFyIEJhc2UgPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS9pbmRleC5qc1wiKSxcbiAgICAgICAgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKTtcblxuICAgIHZhciBTeXN0ZW1QYXJhbWV0ZXJOYW1lcyA9IHtcbiAgICAgICAgXCJub3JtYWxpemVkQ29vcmRzXCIgOiBcIl9zeXNfbm9ybWFsaXplZENvb3Jkc1wiLFxuICAgICAgICBcImhlaWdodFwiOiBcIl9zeXNfaGVpZ2h0XCIsXG4gICAgICAgIFwid2lkdGhcIjogXCJfc3lzX3dpZHRoXCJcbiAgICB9XG5cbiAgICB2YXIgU3lzdGVtRW50cnkgPSB7XG4gICAgICAgIGNvb3Jkczoge1xuICAgICAgICAgICAgcHJvcGVydHk6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5wcm9wZXJ0eS5uYW1lID0gXCJnbF9GcmFnQ29vcmRcIjtcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZS5wcm9wZXJ0eTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgbm9ybWFsaXplZENvb3Jkczoge1xuICAgICAgICAgICAgcHJvcGVydHk6IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQsIGNvbnRleHQsIHN0YXRlKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUuZ2xvYmFsUGFyYW1ldGVyc1tTeXN0ZW1QYXJhbWV0ZXJOYW1lcy5ub3JtYWxpemVkQ29vcmRzXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU2hhZGUuVFlQRVMuT0JKRUNULFxuICAgICAgICAgICAgICAgICAgICBraW5kOiBTaGFkZS5PQkpFQ1RfS0lORFMuRkxPQVQzLFxuICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IFNoYWRlLlNPVVJDRVMuVU5JRk9STVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBub2RlLnByb3BlcnR5Lm5hbWUgPSBTeXN0ZW1QYXJhbWV0ZXJOYW1lcy5ub3JtYWxpemVkQ29vcmRzO1xuICAgICAgICAgICAgICAgIHJldHVybiBub2RlLnByb3BlcnR5O1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBoZWlnaHQ6IHtcbiAgICAgICAgICAgIHByb3BlcnR5OiBmdW5jdGlvbiAobm9kZSwgcGFyZW50LCBjb250ZXh0LCBzdGF0ZSkge1xuICAgICAgICAgICAgICAgIHN0YXRlLmdsb2JhbFBhcmFtZXRlcnNbU3lzdGVtUGFyYW1ldGVyTmFtZXMuaGVpZ2h0XSA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU2hhZGUuVFlQRVMuTlVNQkVSLFxuICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IFNoYWRlLlNPVVJDRVMuVU5JRk9STVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBub2RlLnByb3BlcnR5Lm5hbWUgPSBTeXN0ZW1QYXJhbWV0ZXJOYW1lcy5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGUucHJvcGVydHk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHdpZHRoOiB7XG4gICAgICAgICAgICBwcm9wZXJ0eTogZnVuY3Rpb24gKG5vZGUsIHBhcmVudCwgY29udGV4dCwgc3RhdGUpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5nbG9iYWxQYXJhbWV0ZXJzW1N5c3RlbVBhcmFtZXRlck5hbWVzLndpZHRoXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU2hhZGUuVFlQRVMuTlVNQkVSLFxuICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IFNoYWRlLlNPVVJDRVMuVU5JRk9STVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBub2RlLnByb3BlcnR5Lm5hbWUgPSBTeXN0ZW1QYXJhbWV0ZXJOYW1lcy53aWR0aDtcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZS5wcm9wZXJ0eTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIEJhc2UuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIlN5c3RlbVwiLFxuICAgICAgICBvYmplY3Q6IHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBudWxsLFxuICAgICAgICAgICAgc3RhdGljOiBTeXN0ZW1FbnRyeVxuICAgICAgICB9LFxuICAgICAgICBpbnN0YW5jZTogbnVsbFxuICAgIH0pO1xufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24gKG5zKSB7XG5cbiAgICB2YXIgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheDtcbiAgICB2YXIgQmFzZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9iYXNlL2luZGV4LmpzXCIpO1xuICAgIHZhciBBTk5PID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvYW5ub3RhdGlvbi5qc1wiKS5BTk5PO1xuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpLFxuICAgICAgICBUWVBFUyA9IFNoYWRlLlRZUEVTLFxuICAgICAgICBLSU5EUyA9IFNoYWRlLk9CSkVDVF9LSU5EUyxcbiAgICAgICAgVmVjQmFzZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9iYXNlL3ZlYy5qc1wiKTtcblxuXG4gICAgbnMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gPSBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICBuYW1lOiBub2RlLnByb3BlcnR5Lm5hbWVcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBWZWMgPSB7XG4gICAgICAgIGdlbmVyYXRlVmVjRnJvbUFyZ3M6IGZ1bmN0aW9uKHZlY0NvdW50LCBhcmdzKXtcbiAgICAgICAgICAgIGlmKHZlY0NvdW50ID09IDEpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFyZ3NbMF07XG4gICAgICAgICAgICBpZihhcmdzLmxlbmd0aCA9PSAxICYmIEFOTk8oYXJnc1swXSkuaXNPZktpbmQoS0lORFNbJ0ZMT0FUJyArIHZlY0NvdW50XSkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFyZ3NbMF07XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5OZXdFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIGNhbGxlZToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJWZWNcIiArIHZlY0NvdW50XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBhcmd1bWVudHM6IGFyZ3NcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBBTk5PKHJlc3VsdCkuc2V0VHlwZShUWVBFUy5PQkpFQ1QsIEtJTkRTWydGTE9BVCcgKyB2ZWNDb3VudF0pO1xuICAgICAgICAgICAgQU5OTyhyZXN1bHQuY2FsbGVlKS5zZXRUeXBlKFRZUEVTLkZVTkNUSU9OKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY3JlYXRlU3dpenpsZTogZnVuY3Rpb24odmVjQ291bnQsIHN3aXp6bGUsIG5vZGUsIGFyZ3MsIHBhcmVudCl7XG4gICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgICAgIG5vZGUuY2FsbGVlLmV4dHJhID0gbm9kZS5leHRyYTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZS5jYWxsZWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgc2luZ3VsYXIgPSBzd2l6emxlLmxlbmd0aCA9PSAxO1xuICAgICAgICAgICAgdmFyIGFyZ09iamVjdCA9IHNpbmd1bGFyID8gbm9kZS5hcmd1bWVudHNbMF0gOiBWZWMuZ2VuZXJhdGVWZWNGcm9tQXJncyhzd2l6emxlLmxlbmd0aCwgbm9kZS5hcmd1bWVudHMpO1xuICAgICAgICAgICAgdmFyIHJlcGxhY2UgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk5ld0V4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgY2FsbGVlOiB7XG4gICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgICAgbmFtZTogXCJWZWNcIiArIHZlY0NvdW50XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBhcmd1bWVudHM6IFtdXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIGluZGljZXMgPSBbXTtcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBzd2l6emxlLmxlbmd0aDsgKytpKXtcbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gVmVjQmFzZS5zd2l6emxlVG9JbmRleChzd2l6emxlLmNoYXJBdChpKSk7XG4gICAgICAgICAgICAgICAgaW5kaWNlc1tpZHhdID0gaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCB2ZWNDb3VudDsgKytpKXtcbiAgICAgICAgICAgICAgICBpZihpbmRpY2VzW2ldICE9PSB1bmRlZmluZWQpe1xuICAgICAgICAgICAgICAgICAgICByZXBsYWNlLmFyZ3VtZW50c1tpXSA9IHNpbmd1bGFyID8gYXJnT2JqZWN0IDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IGFyZ09iamVjdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogVmVjQmFzZS5pbmRleFRvU3dpenpsZShpbmRpY2VzW2ldKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgIHJlcGxhY2UuYXJndW1lbnRzW2ldID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IG5vZGUuY2FsbGVlLm9iamVjdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogVmVjQmFzZS5pbmRleFRvU3dpenpsZShpKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIEFOTk8ocmVwbGFjZSkuY29weShBTk5PKG5vZGUpKTtcbiAgICAgICAgICAgIHJldHVybiByZXBsYWNlO1xuICAgICAgICB9LFxuXG4gICAgICAgIGF0dGFjaFN3aXp6bGVzOiBmdW5jdGlvbiAoaW5zdGFuY2UsIHZlY0NvdW50KXtcbiAgICAgICAgICAgIGZvcih2YXIgcyA9IDA7IHMgPCBWZWNCYXNlLnN3aXp6bGVTZXRzLmxlbmd0aDsgKytzKXtcbiAgICAgICAgICAgICAgICBmb3IodmFyIGNvdW50ID0gMTsgY291bnQgPD0gNDsgKytjb3VudCl7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtYXggPSBNYXRoLnBvdyh2ZWNDb3VudCwgY291bnQpO1xuICAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IG1heDsgKytpKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YWwgPSBpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGtleSA9IFwiXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IodmFyICBqID0gMDsgaiA8IGNvdW50OyArK2ope1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHggPSB2YWwgJSB2ZWNDb3VudDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSBNYXRoLmZsb29yKHZhbCAvIHZlY0NvdW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXkrPSBWZWNCYXNlLnN3aXp6bGVTZXRzW3NdW2lkeF07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZVtrZXldID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxFeHA6IFZlYy5jcmVhdGVTd2l6emxlLmJpbmQobnVsbCwgdmVjQ291bnQsIGtleSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgY3JlYXRlT3BlcmF0b3I6IGZ1bmN0aW9uKHZlY0NvdW50LCBvcGVyYXRvciwgbm9kZSwgYXJncywgcGFyZW50KSB7XG4gICAgICAgICAgICB2YXIgb3RoZXIgPSBWZWMuZ2VuZXJhdGVWZWNGcm9tQXJncyh2ZWNDb3VudCwgbm9kZS5hcmd1bWVudHMpO1xuICAgICAgICAgICAgdmFyIHJlcGxhY2UgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IG9wZXJhdG9yLFxuICAgICAgICAgICAgICAgIGxlZnQ6IG5vZGUuY2FsbGVlLm9iamVjdCxcbiAgICAgICAgICAgICAgICByaWdodDogb3RoZXJcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBBTk5PKHJlcGxhY2UpLmNvcHkoQU5OTyhub2RlKSk7XG4gICAgICAgICAgICByZXR1cm4gcmVwbGFjZTtcbiAgICAgICAgfSxcblxuICAgICAgICBhdHRhY2hPcGVyYXRvcnM6IGZ1bmN0aW9uKGluc3RhbmNlLCB2ZWNDb3VudCwgb3BlcmF0b3JzKXtcbiAgICAgICAgICAgIGZvcih2YXIgbmFtZSBpbiBvcGVyYXRvcnMpe1xuICAgICAgICAgICAgICAgIHZhciBvcGVyYXRvciA9IG9wZXJhdG9yc1tuYW1lXTtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZVtuYW1lXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbEV4cDogVmVjLmNyZWF0ZU9wZXJhdG9yLmJpbmQobnVsbCwgdmVjQ291bnQsIG9wZXJhdG9yKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBjcmVhdGVGdW5jdGlvbkNhbGw6IGZ1bmN0aW9uKGZ1bmN0aW9uTmFtZSwgc2Vjb25kVmVjU2l6ZSwgbm9kZSwgYXJncywgcGFyZW50KSB7XG4gICAgICAgICAgICB2YXIgcmVwbGFjZSA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQ2FsbEV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgY2FsbGVlOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBmdW5jdGlvbk5hbWVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50czogW1xuICAgICAgICAgICAgICAgICAgICBub2RlLmNhbGxlZS5vYmplY3RcbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYoc2Vjb25kVmVjU2l6ZSl7XG4gICAgICAgICAgICAgICAgdmFyIG90aGVyID0gVmVjLmdlbmVyYXRlVmVjRnJvbUFyZ3Moc2Vjb25kVmVjU2l6ZSwgbm9kZS5hcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIHJlcGxhY2UuYXJndW1lbnRzLnB1c2gob3RoZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgQU5OTyhyZXBsYWNlKS5jb3B5KEFOTk8obm9kZSkpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcGxhY2U7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2VuZXJhdGVMZW5ndGhDYWxsOiBmdW5jdGlvbihub2RlLCBhcmdzLCBwYXJlbnQpe1xuICAgICAgICAgICAgICAgIGlmKGFyZ3MubGVuZ3RoID09IDApe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVmVjLmNyZWF0ZUZ1bmN0aW9uQ2FsbCgnbGVuZ3RoJywgMCwgbm9kZSwgYXJncywgcGFyZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgIHZhciByZXBsYWNlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVyYXRvcjogJyonLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGVmdDogbm9kZS5jYWxsZWUub2JqZWN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVyYXRvcjogJy8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQ6IG5vZGUuYXJndW1lbnRzWzBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJpZ2h0OiBWZWMuY3JlYXRlRnVuY3Rpb25DYWxsKCdsZW5ndGgnLCAwLCBub2RlLCBhcmdzLCBwYXJlbnQpXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIEFOTk8ocmVwbGFjZS5yaWdodCkuc2V0VHlwZShUWVBFUy5OVU1CRVIpO1xuICAgICAgICAgICAgICAgICAgICBBTk5PKHJlcGxhY2UpLmNvcHkoQU5OTyhub2RlKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXBsYWNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICB9O1xuICAgIG5zLlZlYyA9IFZlYztcblxuICAgIG5zLmV4dGVuZCA9IEJhc2UuZXh0ZW5kO1xuXG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uKG5zKXtcblxuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpO1xuICAgIHZhciBTeW50YXggPSByZXF1aXJlKCdlc3RyYXZlcnNlJykuU3ludGF4O1xuICAgIHZhciBUb29scyA9IHJlcXVpcmUoXCIuL3Rvb2xzLmpzXCIpO1xuICAgIHZhciBBTk5PID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvYW5ub3RhdGlvbi5qc1wiKS5BTk5PO1xuXG4gICAgdmFyIFRZUEVTID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTO1xuXG4gICAgdmFyIFZlYzJJbnN0YW5jZSA9IHtcbiAgICAgICAgbm9ybWFsaXplOiB7XG4gICAgICAgICAgICBjYWxsRXhwOiBUb29scy5WZWMuY3JlYXRlRnVuY3Rpb25DYWxsLmJpbmQobnVsbCwgJ25vcm1hbGl6ZScsIDApXG4gICAgICAgIH0sXG4gICAgICAgIGRvdDoge1xuICAgICAgICAgICAgY2FsbEV4cDogVG9vbHMuVmVjLmNyZWF0ZUZ1bmN0aW9uQ2FsbC5iaW5kKG51bGwsICdkb3QnLCAyKVxuICAgICAgICB9LFxuICAgICAgICBsZW5ndGg6IHtcbiAgICAgICAgICAgIGNhbGxFeHA6IFRvb2xzLlZlYy5nZW5lcmF0ZUxlbmd0aENhbGxcbiAgICAgICAgfVxuICAgIH1cbiAgICBUb29scy5WZWMuYXR0YWNoU3dpenpsZXMoVmVjMkluc3RhbmNlLCAyKTtcbiAgICBUb29scy5WZWMuYXR0YWNoT3BlcmF0b3JzKFZlYzJJbnN0YW5jZSwgMiwge1xuICAgICAgICBhZGQ6ICcrJyxcbiAgICAgICAgc3ViOiAnLScsXG4gICAgICAgIG11bDogJyonLFxuICAgICAgICBkaXY6ICcvJyxcbiAgICAgICAgbW9kOiAnJSdcbiAgICB9KVxuXG5cbiAgICBUb29scy5leHRlbmQobnMsIHtcbiAgICAgICAgaWQ6IFwiVmVjMlwiLFxuICAgICAgICBraW5kOiBLSU5EUy5GTE9BVDIsXG4gICAgICAgIG9iamVjdDoge1xuICAgICAgICAgICAgY29uc3RydWN0b3I6IG51bGwsXG4gICAgICAgICAgICBzdGF0aWM6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIGluc3RhbmNlOiBWZWMySW5zdGFuY2VcbiAgICB9KTtcblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIik7XG4gICAgdmFyIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXg7XG4gICAgdmFyIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XG4gICAgdmFyIEFOTk8gPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkFOTk87XG5cbiAgICB2YXIgVFlQRVMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFM7XG5cbiAgICB2YXIgVmVjM0luc3RhbmNlID0ge1xuICAgICAgICBub3JtYWxpemU6IHtcbiAgICAgICAgICAgIGNhbGxFeHA6IFRvb2xzLlZlYy5jcmVhdGVGdW5jdGlvbkNhbGwuYmluZChudWxsLCAnbm9ybWFsaXplJywgMClcbiAgICAgICAgfSxcbiAgICAgICAgZG90OiB7XG4gICAgICAgICAgICBjYWxsRXhwOiBUb29scy5WZWMuY3JlYXRlRnVuY3Rpb25DYWxsLmJpbmQobnVsbCwgJ2RvdCcsIDMpXG4gICAgICAgIH0sXG4gICAgICAgIGxlbmd0aDoge1xuICAgICAgICAgICAgY2FsbEV4cDogVG9vbHMuVmVjLmdlbmVyYXRlTGVuZ3RoQ2FsbFxuICAgICAgICB9XG4gICAgfVxuICAgIFRvb2xzLlZlYy5hdHRhY2hTd2l6emxlcyhWZWMzSW5zdGFuY2UsIDMpO1xuICAgIFRvb2xzLlZlYy5hdHRhY2hPcGVyYXRvcnMoVmVjM0luc3RhbmNlLCAzLCB7XG4gICAgICAgIGFkZDogJysnLFxuICAgICAgICBzdWI6ICctJyxcbiAgICAgICAgbXVsOiAnKicsXG4gICAgICAgIGRpdjogJy8nLFxuICAgICAgICBtb2Q6ICclJ1xuICAgIH0pXG5cblxuICAgIFRvb2xzLmV4dGVuZChucywge1xuICAgICAgICBpZDogXCJWZWMzXCIsXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUMyxcbiAgICAgICAgb2JqZWN0OiB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogbnVsbCxcbiAgICAgICAgICAgIHN0YXRpYzoge31cbiAgICAgICAgfSxcbiAgICAgICAgaW5zdGFuY2U6IFZlYzNJbnN0YW5jZVxuICAgIH0pO1xuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucyl7XG5cbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKTtcbiAgICB2YXIgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheDtcbiAgICB2YXIgVG9vbHMgPSByZXF1aXJlKFwiLi90b29scy5qc1wiKTtcbiAgICB2YXIgQU5OTyA9IHJlcXVpcmUoXCIuLi8uLi8uLi9iYXNlL2Fubm90YXRpb24uanNcIikuQU5OTztcblxuICAgIHZhciBUWVBFUyA9IFNoYWRlLlRZUEVTLFxuICAgICAgICBLSU5EUyA9IFNoYWRlLk9CSkVDVF9LSU5EUztcblxuICAgIHZhciBWZWM0SW5zdGFuY2UgPSB7XG4gICAgICAgIG5vcm1hbGl6ZToge1xuICAgICAgICAgICAgY2FsbEV4cDogVG9vbHMuVmVjLmNyZWF0ZUZ1bmN0aW9uQ2FsbC5iaW5kKG51bGwsICdub3JtYWxpemUnLCAwKVxuICAgICAgICB9LFxuICAgICAgICBkb3Q6IHtcbiAgICAgICAgICAgIGNhbGxFeHA6IFRvb2xzLlZlYy5jcmVhdGVGdW5jdGlvbkNhbGwuYmluZChudWxsLCAnZG90JywgNClcbiAgICAgICAgfSxcbiAgICAgICAgbGVuZ3RoOiB7XG4gICAgICAgICAgICBjYWxsRXhwOiBUb29scy5WZWMuZ2VuZXJhdGVMZW5ndGhDYWxsXG4gICAgICAgIH1cbiAgICB9XG4gICAgVG9vbHMuVmVjLmF0dGFjaFN3aXp6bGVzKFZlYzRJbnN0YW5jZSwgNCk7XG4gICAgVG9vbHMuVmVjLmF0dGFjaE9wZXJhdG9ycyhWZWM0SW5zdGFuY2UsIDQsIHtcbiAgICAgICAgYWRkOiAnKycsXG4gICAgICAgIHN1YjogJy0nLFxuICAgICAgICBtdWw6ICcqJyxcbiAgICAgICAgZGl2OiAnLycsXG4gICAgICAgIG1vZDogJyUnXG4gICAgfSlcblxuXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIlZlYzRcIixcbiAgICAgICAga2luZDogS0lORFMuRkxPQVQ0LFxuICAgICAgICBvYmplY3Q6IHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBudWxsLFxuICAgICAgICAgICAgc3RhdGljOiB7fVxuICAgICAgICB9LFxuICAgICAgICBpbnN0YW5jZTogVmVjNEluc3RhbmNlXG4gICAgfSk7XG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uIChucykge1xuXG4gICAgdmFyIEJhc2UgPSByZXF1aXJlKFwiLi4vLi4vYmFzZS9pbmRleC5qc1wiKSxcbiAgICAgICAgQW5ub3RhdGlvbiA9IHJlcXVpcmUoXCIuLi8uLi9iYXNlL2Fubm90YXRpb24uanNcIikuQW5ub3RhdGlvbixcbiAgICAgICAgRnVuY3Rpb25Bbm5vdGF0aW9uID0gcmVxdWlyZShcIi4uLy4uL2Jhc2UvYW5ub3RhdGlvbi5qc1wiKS5GdW5jdGlvbkFubm90YXRpb24sXG4gICAgICAgIFR5cGVJbmZvID0gcmVxdWlyZShcIi4uLy4uL2Jhc2UvdHlwZWluZm8uanNcIikuVHlwZUluZm8sXG4gICAgICAgIFNoYWRlID0gcmVxdWlyZShcIi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgVHlwZXMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgS2luZHMgPSBTaGFkZS5PQkpFQ1RfS0lORFMsXG4gICAgICAgIFNvdXJjZXMgPSByZXF1aXJlKFwiLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpLlNPVVJDRVM7XG5cbiAgICB2YXIgT2JqZWN0UmVnaXN0cnkgPSByZXF1aXJlKFwiLi9yZWdpc3RyeS9pbmRleC5qc1wiKS5SZWdpc3RyeSxcbiAgICAgICAgQ29udGV4dCA9IHJlcXVpcmUoXCIuLi8uLi9iYXNlL2NvbnRleHQuanNcIikuZ2V0Q29udGV4dChPYmplY3RSZWdpc3RyeSk7XG5cblxuICAgIHZhciB3YWxrID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpO1xuICAgIHZhciBTeW50YXggPSB3YWxrLlN5bnRheDtcblxuXG4gICAgLyoqXG4gICAgICogVHJhbnNmb3JtcyB0aGUgSlMgQVNUIHRvIGFuIEFTVCByZXByZXNlbnRhdGlvbiBjb252ZW5pZW50XG4gICAgICogZm9yIGNvZGUgZ2VuZXJhdGlvblxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIHZhciBHTEFTVFRyYW5zZm9ybWVyID0gZnVuY3Rpb24gKG1haW5JZCkge1xuICAgICAgICB0aGlzLm1haW5JZCA9IG1haW5JZDtcbiAgICB9O1xuXG4gICAgQmFzZS5leHRlbmQoR0xBU1RUcmFuc2Zvcm1lci5wcm90b3R5cGUsIHtcbiAgICAgICAgcmVnaXN0ZXJHbG9iYWxDb250ZXh0IDogZnVuY3Rpb24gKHByb2dyYW0pIHtcbiAgICAgICAgICAgIHZhciBjdHggPSBuZXcgQ29udGV4dChwcm9ncmFtLCBudWxsLCB7bmFtZTogXCJnbG9iYWxcIn0pO1xuICAgICAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwiTWF0aFwiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJNYXRoXCIpKTtcbiAgICAgICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcInRoaXNcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiU3lzdGVtXCIpKTtcbiAgICAgICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIlNoYWRlXCIsIE9iamVjdFJlZ2lzdHJ5LmdldEJ5TmFtZShcIlNoYWRlXCIpKTtcbiAgICAgICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIlZlYzJcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiVmVjMlwiKSk7XG4gICAgICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJWZWMzXCIsIE9iamVjdFJlZ2lzdHJ5LmdldEJ5TmFtZShcIlZlYzNcIikpO1xuICAgICAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwiQ29sb3JcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiVmVjM1wiKSk7XG4gICAgICAgICAgICBjdHguZGVjbGFyZVZhcmlhYmxlKFwiZ2xfRnJhZ0Nvb3JkXCIsIGZhbHNlKTtcbiAgICAgICAgICAgIGN0eC51cGRhdGVFeHByZXNzaW9uKFwiZ2xfRnJhZ0Nvb3JkXCIsIG5ldyBUeXBlSW5mbyh7XG4gICAgICAgICAgICAgICAgZXh0cmE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVHlwZXMuT0JKRUNULFxuICAgICAgICAgICAgICAgICAgICBraW5kOiBLaW5kcy5GTE9BVDNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICBjdHguZGVjbGFyZVZhcmlhYmxlKFwiX3N5c19ub3JtYWxpemVkQ29vcmRzXCIsIGZhbHNlKTtcbiAgICAgICAgICAgIGN0eC51cGRhdGVFeHByZXNzaW9uKFwiX3N5c19ub3JtYWxpemVkQ29vcmRzXCIsIG5ldyBUeXBlSW5mbyh7XG4gICAgICAgICAgICAgICAgZXh0cmE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVHlwZXMuT0JKRUNULFxuICAgICAgICAgICAgICAgICAgICBraW5kOiBLaW5kcy5GTE9BVDNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgIHJldHVybiBjdHg7XG4gICAgICAgIH0sXG4gICAgICAgIHRyYW5zZm9ybUFBU1Q6IGZ1bmN0aW9uIChwcm9ncmFtKSB7XG4gICAgICAgICAgICB0aGlzLnJvb3QgPSBwcm9ncmFtO1xuICAgICAgICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLnJlZ2lzdGVyR2xvYmFsQ29udGV4dChwcm9ncmFtKTtcblxuICAgICAgICAgICAgdmFyIHN0YXRlID0ge1xuICAgICAgICAgICAgICAgICBjb250ZXh0OiBjb250ZXh0LFxuICAgICAgICAgICAgICAgICBjb250ZXh0U3RhY2s6IFtjb250ZXh0XSxcbiAgICAgICAgICAgICAgICAgaW5NYWluOiAgdGhpcy5tYWluSWQgPT0gY29udGV4dC5zdHIoKSxcbiAgICAgICAgICAgICAgICAgZ2xvYmFsUGFyYW1ldGVycyA6IHByb2dyYW0uaW5qZWN0aW9uc1t0aGlzLm1haW5JZF0gJiYgcHJvZ3JhbS5pbmplY3Rpb25zW3RoaXMubWFpbklkXVswXSA/IHByb2dyYW0uaW5qZWN0aW9uc1t0aGlzLm1haW5JZF1bMF0ubm9kZS5pbmZvIDoge30sXG4gICAgICAgICAgICAgICAgIGJsb2NrZWROYW1lcyA6IFtdLFxuICAgICAgICAgICAgICAgICB0b3BEZWNsYXJhdGlvbnMgOiBbXSxcbiAgICAgICAgICAgICAgICAgaWROYW1lTWFwIDoge31cbiAgICAgICAgICAgIH1cblxuXG5cbiAgICAgICAgICAgIGZvcih2YXIgbmFtZSBpbiBzdGF0ZS5nbG9iYWxQYXJhbWV0ZXJzKXtcbiAgICAgICAgICAgICAgICBzdGF0ZS5ibG9ja2VkTmFtZXMucHVzaChuYW1lKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5yZXBsYWNlKHByb2dyYW0sIHN0YXRlKTtcblxuICAgICAgICAgICAgZm9yKHZhciBuYW1lIGluIHN0YXRlLmdsb2JhbFBhcmFtZXRlcnMpe1xuICAgICAgICAgICAgICAgIGlmKG5hbWUgIT09IFwiX2dsb2JhbFwiKVxuICAgICAgICAgICAgICAgICAgICB2YXIgZGVjbCA9IGhhbmRsZVRvcERlY2xhcmF0aW9uKG5hbWUsIHN0YXRlLmdsb2JhbFBhcmFtZXRlcnMpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGVjbClcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyYW0uYm9keS51bnNoaWZ0KGRlY2wpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcHJvZ3JhbTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0IX0gYXN0XG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0IX0gc3RhdGVcbiAgICAgICAgICogQHJldHVybnMgeyp9XG4gICAgICAgICAqL1xuICAgICAgICByZXBsYWNlOiBmdW5jdGlvbihhc3QsIHN0YXRlKSB7XG4gICAgICAgICAgICB3YWxrLnJlcGxhY2UoYXN0LCB7XG5cbiAgICAgICAgICAgICAgICBlbnRlcjogZnVuY3Rpb24gKG5vZGUsIHBhcmVudCkge1xuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiRW50ZXI6XCIsIG5vZGUudHlwZSk7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAobm9kZS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5JZGVudGlmaWVyOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVJZGVudGlmaWVyKG5vZGUsIHBhcmVudCwgc3RhdGUuYmxvY2tlZE5hbWVzLCBzdGF0ZS5pZE5hbWVNYXApO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguSWZTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhhbmRsZUlmU3RhdGVtZW50KG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQ29uZGl0aW9uYWxFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVDb25kaXRpb25hbEV4cHJlc3Npb24obm9kZSwgc3RhdGUsIHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguTG9naWNhbEV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhhbmRsZUxvZ2ljYWxFeHByZXNzaW9uKG5vZGUsIHRoaXMsIHN0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb246XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm8gbmVlZCB0byBkZWNsYXJlLCB0aGlzIGhhcyBiZWVuIGFubm90YXRlZCBhbHJlYWR5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmVudENvbnRleHQgPSBzdGF0ZS5jb250ZXh0U3RhY2tbc3RhdGUuY29udGV4dFN0YWNrLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb250ZXh0ID0gbmV3IENvbnRleHQobm9kZSwgcGFyZW50Q29udGV4dCwge25hbWU6IG5vZGUuaWQubmFtZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZS5jb250ZXh0ID0gY29udGV4dDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZS5jb250ZXh0U3RhY2sucHVzaChjb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZS5pbk1haW4gPSB0aGlzLm1haW5JZCA9PSBjb250ZXh0LnN0cigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpLFxuXG4gICAgICAgICAgICAgICAgbGVhdmU6IGZ1bmN0aW9uKG5vZGUsIHBhcmVudCkge1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2gobm9kZS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5NZW1iZXJFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVNZW1iZXJFeHByZXNzaW9uKG5vZGUsIHBhcmVudCwgc3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQ2FsbEV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhhbmRsZUNhbGxFeHByZXNzaW9uKG5vZGUsIHBhcmVudCwgc3RhdGUudG9wRGVjbGFyYXRpb25zLCBzdGF0ZS5jb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb246XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUuY29udGV4dCA9IHN0YXRlLmNvbnRleHRTdGFjay5wb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZS5pbk1haW4gPSBzdGF0ZS5jb250ZXh0LnN0cigpID09IHRoaXMubWFpbklkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdGF0ZS5pbk1haW4pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVNYWluRnVuY3Rpb24obm9kZSwgcGFyZW50LCBzdGF0ZS5jb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlJldHVyblN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihzdGF0ZS5pbk1haW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhhbmRsZVJldHVybkluTWFpbihub2RlLCBwYXJlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkJpbmFyeUV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhhbmRsZUJpbmFyeUV4cHJlc3Npb24obm9kZSwgcGFyZW50KTtcblxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBhc3Q7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHZhciBoYW5kbGVUb3BEZWNsYXJhdGlvbiA9IGZ1bmN0aW9uKG5hbWUsIGdsb2JhbFBhcmFtZXRlcnMpe1xuICAgICAgICB2YXIgcHJvcGVydHlMaXRlcmFsID0gIHsgdHlwZTogU3ludGF4LklkZW50aWZpZXIsIG5hbWU6IGdldE5hbWVGb3JHbG9iYWwoZ2xvYmFsUGFyYW1ldGVycywgbmFtZSl9O1xuICAgICAgICB2YXIgcHJvcGVydHlBbm5vdGF0aW9uID0gIG5ldyBBbm5vdGF0aW9uKHByb3BlcnR5TGl0ZXJhbCk7XG4gICAgICAgIHByb3BlcnR5QW5ub3RhdGlvbi5zZXRGcm9tRXh0cmEoZ2xvYmFsUGFyYW1ldGVyc1tuYW1lXSk7XG5cbiAgICAgICAgaWYgKHByb3BlcnR5QW5ub3RhdGlvbi5pc051bGxPclVuZGVmaW5lZCgpKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHZhciBkZWNsID0ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LlZhcmlhYmxlRGVjbGFyYXRpb24sXG4gICAgICAgICAgICBkZWNsYXJhdGlvbnM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5WYXJpYWJsZURlY2xhcmF0b3IsXG4gICAgICAgICAgICAgICAgICAgIGlkOiBwcm9wZXJ0eUxpdGVyYWwsXG4gICAgICAgICAgICAgICAgICAgIGluaXQ6IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAga2luZDogXCJ2YXJcIlxuICAgICAgICB9O1xuICAgICAgICB2YXIgZGVjbEFubm90YXRpb24gPSAgbmV3IEFubm90YXRpb24oZGVjbC5kZWNsYXJhdGlvbnNbMF0pO1xuICAgICAgICBkZWNsQW5ub3RhdGlvbi5jb3B5KHByb3BlcnR5QW5ub3RhdGlvbik7XG4gICAgICAgIHJldHVybiBkZWNsO1xuICAgIH1cblxuICAgIHZhciBoYW5kbGVJZGVudGlmaWVyID0gZnVuY3Rpb24obm9kZSwgcGFyZW50LCBibG9ja2VkTmFtZXMsIGlkTmFtZU1hcCl7XG4gICAgICAgIGlmKHBhcmVudC50eXBlID09IFN5bnRheC5GdW5jdGlvbkRlY2xhcmF0aW9uKVxuICAgICAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgICAgIHZhciBuYW1lID0gbm9kZS5uYW1lO1xuICAgICAgICBpZihpZE5hbWVNYXBbbmFtZV0pIG5vZGUubmFtZSA9IGlkTmFtZU1hcFtuYW1lXTtcbiAgICAgICAgdmFyIG5ld05hbWUgPSBuYW1lLCBpID0gMTtcbiAgICAgICAgd2hpbGUoYmxvY2tlZE5hbWVzLmluZGV4T2YobmV3TmFtZSkgIT0gLTEpe1xuICAgICAgICAgICAgbmV3TmFtZSA9IG5hbWUgKyBcIl9cIiArICgrK2kpO1xuICAgICAgICB9XG4gICAgICAgIGlkTmFtZU1hcFtuYW1lXSA9IG5ld05hbWU7XG4gICAgICAgIG5vZGUubmFtZSA9IG5ld05hbWU7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH1cblxuXG4gICAgdmFyIGhhbmRsZVJldHVybkluTWFpbiA9IGZ1bmN0aW9uKG5vZGUsIHBhcmVudCkge1xuICAgICAgICBpZiAobm9kZS5hcmd1bWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmxvY2tTdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgYm9keTogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQXNzaWdubWVudEV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVyYXRvcjogXCI9XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBsZWZ0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJnbF9GcmFnQ29sb3JcIlxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJpZ2h0OiBub2RlLmFyZ3VtZW50XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5SZXR1cm5TdGF0ZW1lbnRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkV4cHJlc3Npb25TdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgZXhwcmVzc2lvbiA6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiZGlzY2FyZFwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBoYW5kbGVNYWluRnVuY3Rpb24gPSBmdW5jdGlvbihub2RlLCBwYXJlbnQsIGNvbnRleHQpIHtcbiAgICAgICAgdmFyIGFubm8gPSBuZXcgRnVuY3Rpb25Bbm5vdGF0aW9uKG5vZGUpO1xuICAgICAgICBhbm5vLnNldFJldHVybkluZm8oeyB0eXBlOiBUeXBlcy5VTkRFRklORUQgfSk7XG5cbiAgICAgICAgLy8gY29uc29sZS5sb2coY29udGV4dCk7XG4gICAgICAgIC8vIE1haW4gaGFzIG5vIHBhcmFtZXRlcnNcbiAgICAgICAgbm9kZS5wYXJhbXMgPSBbXTtcbiAgICAgICAgLy8gUmVuYW1lIHRvICdtYWluJ1xuICAgICAgICBub2RlLmlkLm5hbWUgPSBcIm1haW5cIjtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhub2RlKTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIGdldE5hbWVPZk5vZGUobm9kZSkge1xuICAgICAgICBzd2l0Y2ggKG5vZGUudHlwZSkge1xuICAgICAgICAgICAgY2FzZSBTeW50YXguSWRlbnRpZmllcjpcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZS5uYW1lO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguTWVtYmVyRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2V0TmFtZU9mTm9kZShub2RlLm9iamVjdCkgKyBcIi5cIiArIGdldE5hbWVPZk5vZGUobm9kZS5wcm9wZXJ0eSk7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5OZXdFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIHJldHVybiBnZXROYW1lT2ZOb2RlKG5vZGUuY2FsbGVlKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwidW5rbm93bihcIiArIG5vZGUudHlwZSArIFwiKVwiO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGdldE9iamVjdFJlZmVyZW5jZUZyb21Ob2RlKG9iamVjdCwgY29udGV4dCkge1xuICAgICAgICBzd2l0Y2ggKG9iamVjdC50eXBlKSB7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5OZXdFeHByZXNzaW9uOlxuICAgICAgICAgICAgY2FzZSBTeW50YXguQ2FsbEV4cHJlc3Npb246XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5NZW1iZXJFeHByZXNzaW9uOlxuICAgICAgICAgICAgY2FzZSBTeW50YXguQmluYXJ5RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICByZXR1cm4gY29udGV4dC5jcmVhdGVUeXBlSW5mbyhvYmplY3QpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguSWRlbnRpZmllcjpcbiAgICAgICAgICAgICAgICByZXR1cm4gY29udGV4dC5nZXRCaW5kaW5nQnlOYW1lKG9iamVjdC5uYW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlRoaXNFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIHJldHVybiBjb250ZXh0LmdldEJpbmRpbmdCeU5hbWUoXCJ0aGlzXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmhhbmRsZWQgb2JqZWN0IHR5cGUgaW4gR0xTTCBnZW5lcmF0aW9uOiBcIiArIG9iamVjdC50eXBlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBoYW5kbGVDYWxsRXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChjYWxsRXhwcmVzc2lvbiwgcGFyZW50LCB0b3BEZWNsYXJhdGlvbnMsIGNvbnRleHQpIHtcblxuICAgICAgICAvLyBJcyB0aGlzIGEgY2FsbCBvbiBhbiBvYmplY3Q/XG4gICAgICAgIGlmIChjYWxsRXhwcmVzc2lvbi5jYWxsZWUudHlwZSA9PSBTeW50YXguTWVtYmVyRXhwcmVzc2lvbikge1xuICAgICAgICAgICAgdmFyIGNhbGxlZVJlZmVyZW5jZSA9IGdldE9iamVjdFJlZmVyZW5jZUZyb21Ob2RlKGNhbGxFeHByZXNzaW9uLmNhbGxlZSwgY29udGV4dCk7XG4gICAgICAgICAgICBpZighKGNhbGxlZVJlZmVyZW5jZSAmJiBjYWxsZWVSZWZlcmVuY2UuaXNGdW5jdGlvbigpKSlcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTb21ldGhpbmcgd2VudCB3cm9uZyBpbiB0eXBlIGluZmVyZW5jZVwiKTtcblxuICAgICAgICAgICAgdmFyIG9iamVjdCA9IGNhbGxFeHByZXNzaW9uLmNhbGxlZS5vYmplY3QsXG4gICAgICAgICAgICAgICAgcHJvcGVydHlOYW1lID0gY2FsbEV4cHJlc3Npb24uY2FsbGVlLnByb3BlcnR5Lm5hbWU7XG5cbiAgICAgICAgICAgIHZhciBvYmplY3RSZWZlcmVuY2UgPSBnZXRPYmplY3RSZWZlcmVuY2VGcm9tTm9kZShvYmplY3QsIGNvbnRleHQpO1xuICAgICAgICAgICAgaWYoIW9iamVjdFJlZmVyZW5jZSkgIHtcbiAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKGNhbGxFeHByZXNzaW9uLCBcIkludGVybmFsOiBObyBvYmplY3QgaW5mbyBmb3I6IFwiICsgb2JqZWN0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIG9iamVjdEluZm8gPSBjb250ZXh0LmdldE9iamVjdEluZm9Gb3Iob2JqZWN0UmVmZXJlbmNlKTtcbiAgICAgICAgICAgIGlmKCFvYmplY3RJbmZvKSB7IC8vIEV2ZXJ5IG9iamVjdCBuZWVkcyBhbiBpbmZvLCBvdGhlcndpc2Ugd2UgZGlkIHNvbWV0aGluZyB3cm9uZ1xuICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IoY2FsbEV4cHJlc3Npb24sIFwiSW50ZXJuYWwgRXJyb3I6IE5vIG9iamVjdCByZWdpc3RlcmVkIGZvcjogXCIgKyBvYmplY3RSZWZlcmVuY2UuZ2V0VHlwZVN0cmluZygpICsgXCIsIFwiICsgZ2V0TmFtZU9mTm9kZShjYWxsRXhwcmVzc2lvbi5jYWxsZWUub2JqZWN0KStcIiwgXCIrY2FsbEV4cHJlc3Npb24uY2FsbGVlLm9iamVjdC50eXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvYmplY3RJbmZvLmhhc093blByb3BlcnR5KHByb3BlcnR5TmFtZSkpIHtcbiAgICAgICAgICAgICAgICB2YXIgcHJvcGVydHlIYW5kbGVyID0gb2JqZWN0SW5mb1twcm9wZXJ0eU5hbWVdO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcHJvcGVydHlIYW5kbGVyLmNhbGxFeHAgPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQW5ub3RhdGlvbi5jcmVhdGVBbm5vdGF0ZWROb2RlQXJyYXkoY2FsbEV4cHJlc3Npb24uYXJndW1lbnRzLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByb3BlcnR5SGFuZGxlci5jYWxsRXhwKGNhbGxFeHByZXNzaW9uLCBhcmdzLCBwYXJlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG5cbiAgICB9XG5cblxuICAgIHZhciBoYW5kbGVNZW1iZXJFeHByZXNzaW9uID0gZnVuY3Rpb24gKG1lbWJlckV4cHJlc3Npb24sIHBhcmVudCwgc3RhdGUpIHtcbiAgICAgICAgdmFyIHByb3BlcnR5TmFtZSA9IG1lbWJlckV4cHJlc3Npb24ucHJvcGVydHkubmFtZSxcbiAgICAgICAgICAgIGNvbnRleHQgPSBzdGF0ZS5jb250ZXh0O1xuXG4gICAgICAgIHZhciBvYmplY3RSZWZlcmVuY2UgPSBnZXRPYmplY3RSZWZlcmVuY2VGcm9tTm9kZShtZW1iZXJFeHByZXNzaW9uLm9iamVjdCwgY29udGV4dCk7XG5cbiAgICAgICAgaWYgKG9iamVjdFJlZmVyZW5jZSAmJiBvYmplY3RSZWZlcmVuY2UuaXNPYmplY3QoKSkge1xuICAgICAgICAgICAgdmFyIG9iamVjdEluZm8gPSBjb250ZXh0LmdldE9iamVjdEluZm9Gb3Iob2JqZWN0UmVmZXJlbmNlKTtcbiAgICAgICAgICAgIGlmKCFvYmplY3RJbmZvKSB7Ly8gRXZlcnkgb2JqZWN0IG5lZWRzIGFuIGluZm8sIG90aGVyd2lzZSB3ZSBkaWQgc29tZXRoaW5nIHdyb25nXG4gICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihtZW1iZXJFeHByZXNzaW9uLCBcIkludGVybmFsIEVycm9yOiBObyBvYmplY3QgcmVnaXN0ZXJlZCBmb3I6IFwiICsgb2JqZWN0UmVmZXJlbmNlLmdldFR5cGVTdHJpbmcoKSArIEpTT04uc3RyaW5naWZ5KG1lbWJlckV4cHJlc3Npb24ub2JqZWN0KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob2JqZWN0SW5mby5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdmFyIHByb3BlcnR5SGFuZGxlciA9IG9iamVjdEluZm9bcHJvcGVydHlOYW1lXTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHByb3BlcnR5SGFuZGxlci5wcm9wZXJ0eSA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHByb3BlcnR5SGFuZGxlci5wcm9wZXJ0eShtZW1iZXJFeHByZXNzaW9uLCBwYXJlbnQsIGNvbnRleHQsIHN0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZXhwID0gbmV3IEFubm90YXRpb24obWVtYmVyRXhwcmVzc2lvbik7XG4gICAgICAgIGlmKG9iamVjdFJlZmVyZW5jZSAmJiBvYmplY3RSZWZlcmVuY2UuaXNHbG9iYWwoKSkge1xuICAgICAgICAgICAgdmFyIHByb3BlcnR5TGl0ZXJhbCA9ICB7IHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLCBuYW1lOiBnZXROYW1lRm9yR2xvYmFsKG9iamVjdFJlZmVyZW5jZSwgcHJvcGVydHlOYW1lKX07XG4gICAgICAgICAgICB2YXIgcHJvcGVydHlBbm5vdGF0aW9uID0gIG5ldyBBbm5vdGF0aW9uKHByb3BlcnR5TGl0ZXJhbCk7XG4gICAgICAgICAgICBwcm9wZXJ0eUFubm90YXRpb24uY29weShleHApO1xuICAgICAgICAgICAgcHJvcGVydHlBbm5vdGF0aW9uLnNldEdsb2JhbCh0cnVlKTtcblxuICAgICAgICAgICAgcmV0dXJuIHByb3BlcnR5TGl0ZXJhbDtcbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIHZhciBnZXROYW1lRm9yR2xvYmFsID0gZnVuY3Rpb24ocmVmZXJlbmNlLCBiYXNlTmFtZSkge1xuICAgICAgICB2YXIgZW50cnkgPSByZWZlcmVuY2VbYmFzZU5hbWVdO1xuICAgICAgICBpZihlbnRyeSkge1xuICAgICAgICAgICAgaWYgKGVudHJ5LnNvdXJjZSA9PSBTb3VyY2VzLlZFUlRFWCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBcImZyYWdfXCIgKyBiYXNlTmFtZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYmFzZU5hbWU7XG4gICAgfVxuXG4gICAgdmFyIGhhbmRsZUJpbmFyeUV4cHJlc3Npb24gPSBmdW5jdGlvbiAoYmluYXJ5RXhwcmVzc2lvbiwgcGFyZW50LCBjYikge1xuICAgICAgICAvLyBJbiBHTCwgd2UgY2FuJ3QgbWl4IHVwIGZsb2F0cywgaW50cyBhbmQgYm9vbGQgZm9yIGJpbmFyeSBleHByZXNzaW9uc1xuICAgICAgICB2YXIgbGVmdCA9IG5ldyBBbm5vdGF0aW9uKGJpbmFyeUV4cHJlc3Npb24ubGVmdCksXG4gICAgICAgICAgICByaWdodCA9IG5ldyBBbm5vdGF0aW9uKGJpbmFyeUV4cHJlc3Npb24ucmlnaHQpO1xuXG4gICAgICAgIGlmIChsZWZ0LmlzTnVtYmVyKCkgJiYgcmlnaHQuaXNJbnQoKSkge1xuICAgICAgICAgICAgYmluYXJ5RXhwcmVzc2lvbi5yaWdodCA9IGNhc3RUb0Zsb2F0KGJpbmFyeUV4cHJlc3Npb24ucmlnaHQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHJpZ2h0LmlzTnVtYmVyKCkgJiYgbGVmdC5pc0ludCgpKSB7XG4gICAgICAgICAgICBiaW5hcnlFeHByZXNzaW9uLmxlZnQgPSBjYXN0VG9GbG9hdChiaW5hcnlFeHByZXNzaW9uLmxlZnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGJpbmFyeUV4cHJlc3Npb24ub3BlcmF0b3IgPT0gXCIlXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBoYW5kbGVNb2R1bG8oYmluYXJ5RXhwcmVzc2lvbik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGJpbmFyeUV4cHJlc3Npb247XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2FzdFRvRmxvYXQoYXN0KSB7XG4gICAgICAgIHZhciBleHAgPSBuZXcgQW5ub3RhdGlvbihhc3QpO1xuXG4gICAgICAgIGlmICghZXhwLmlzTnVtYmVyKCkpIHsgICAvLyBDYXN0XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5DYWxsRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBjYWxsZWU6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiZmxvYXRcIlxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgYXJndW1lbnRzOiBbYXN0XVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhc3Q7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2FzdFRvSW50KGFzdCwgZm9yY2UpIHtcbiAgICAgICAgdmFyIGV4cCA9IG5ldyBBbm5vdGF0aW9uKGFzdCk7XG5cbiAgICAgICAgaWYgKCFleHAuaXNJbnQoKSB8fCBmb3JjZSkgeyAgIC8vIENhc3RcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkNhbGxFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIGNhbGxlZToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJpbnRcIlxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgYXJndW1lbnRzOiBbYXN0XVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhc3Q7XG4gICAgfVxuXG4gICAgdmFyIGhhbmRsZU1vZHVsbyA9IGZ1bmN0aW9uIChiaW5hcnlFeHByZXNzaW9uKSB7XG4gICAgICAgIGJpbmFyeUV4cHJlc3Npb24ucmlnaHQgPSBjYXN0VG9GbG9hdChiaW5hcnlFeHByZXNzaW9uLnJpZ2h0KTtcbiAgICAgICAgYmluYXJ5RXhwcmVzc2lvbi5sZWZ0ID0gY2FzdFRvRmxvYXQoYmluYXJ5RXhwcmVzc2lvbi5sZWZ0KTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5DYWxsRXhwcmVzc2lvbixcbiAgICAgICAgICAgIGNhbGxlZToge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxuICAgICAgICAgICAgICAgIG5hbWU6IFwibW9kXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhcmd1bWVudHM6IFtcbiAgICAgICAgICAgICAgICBiaW5hcnlFeHByZXNzaW9uLmxlZnQsXG4gICAgICAgICAgICAgICAgYmluYXJ5RXhwcmVzc2lvbi5yaWdodFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGV4dHJhOiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVHlwZXMuTlVNQkVSXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgaGFuZGxlQ29uZGl0aW9uYWxFeHByZXNzaW9uID0gZnVuY3Rpb24obm9kZSwgc3RhdGUsIHJvb3QpIHtcbiAgICAgICAgdmFyIGNvbnNlcXVlbnQgPSBuZXcgQW5ub3RhdGlvbihub2RlLmNvbnNlcXVlbnQpO1xuICAgICAgICB2YXIgYWx0ZXJuYXRlID0gbmV3IEFubm90YXRpb24obm9kZS5hbHRlcm5hdGUpO1xuICAgICAgICBpZiAoY29uc2VxdWVudC5jYW5FbGltaW5hdGUoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHJvb3QucmVwbGFjZShub2RlLmFsdGVybmF0ZSwgc3RhdGUpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChhbHRlcm5hdGUuY2FuRWxpbWluYXRlKCkpIHtcbiAgICAgICAgICAgIHJldHVybiByb290LnJlcGxhY2Uobm9kZS5jb25zZXF1ZW50LCBzdGF0ZSk7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIHZhciBoYW5kbGVJZlN0YXRlbWVudCA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHZhciBjb25zZXF1ZW50ID0gbmV3IEFubm90YXRpb24obm9kZS5jb25zZXF1ZW50KTtcbiAgICAgICAgdmFyIGFsdGVybmF0ZSA9IG5vZGUuYWx0ZXJuYXRlID8gbmV3IEFubm90YXRpb24obm9kZS5hbHRlcm5hdGUpIDogbnVsbDtcbiAgICAgICAgaWYgKGNvbnNlcXVlbnQuY2FuRWxpbWluYXRlKCkpIHtcbiAgICAgICAgICAgIGlmIChhbHRlcm5hdGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZS5hbHRlcm5hdGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5FbXB0eVN0YXRlbWVudFxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGFsdGVybmF0ZSAmJiBhbHRlcm5hdGUuY2FuRWxpbWluYXRlKCkpIHtcbiAgICAgICAgICAgIHJldHVybiBub2RlLmNvbnNlcXVlbnQ7XG4gICAgICAgIH1cbiAgICAgICAgLy8gV2Ugc3RpbGwgaGF2ZSBhIHJlYWwgaWYgc3RhdGVtZW50XG4gICAgICAgdmFyIHRlc3QgPSBuZXcgQW5ub3RhdGlvbihub2RlLnRlc3QpO1xuICAgICAgIHN3aXRjaCh0ZXN0LmdldFR5cGUoKSkge1xuICAgICAgICAgICBjYXNlIFR5cGVzLklOVDpcbiAgICAgICAgICAgY2FzZSBUeXBlcy5OVU1CRVI6XG4gICAgICAgICAgICAgICBub2RlLnRlc3QgPSB7XG4gICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgb3BlcmF0b3I6IFwiIT1cIixcbiAgICAgICAgICAgICAgICAgICBsZWZ0OiBub2RlLnRlc3QsXG4gICAgICAgICAgICAgICAgICAgcmlnaHQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkxpdGVyYWwsXG4gICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICBleHRyYToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogdGVzdC5nZXRUeXBlKClcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgIH1cbiAgICAgICB9XG5cblxuICAgIH07XG5cbiAgICB2YXIgaGFuZGxlTG9naWNhbEV4cHJlc3Npb24gPSBmdW5jdGlvbiAobm9kZSwgcm9vdCwgc3RhdGUpIHtcbiAgICAgICAgdmFyIGxlZnQgPSBuZXcgQW5ub3RhdGlvbihub2RlLmxlZnQpO1xuICAgICAgICB2YXIgcmlnaHQgPSBuZXcgQW5ub3RhdGlvbihub2RlLnJpZ2h0KTtcbiAgICAgICAgaWYgKGxlZnQuY2FuRWxpbWluYXRlKCkpXG4gICAgICAgICAgICByZXR1cm4gcm9vdC5yZXBsYWNlKG5vZGUucmlnaHQsIHN0YXRlKTtcbiAgICAgICAgaWYgKHJpZ2h0LmNhbkVsaW1pbmF0ZSgpKVxuICAgICAgICAgICAgcmV0dXJuIHJvb3QucmVwbGFjZShub2RlLmxlZnQsIHN0YXRlKTtcbiAgICB9XG5cbiAgICAvLyBFeHBvcnRzXG4gICAgbnMuR0xBU1RUcmFuc2Zvcm1lciA9IEdMQVNUVHJhbnNmb3JtZXI7XG5cblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24gKG5zKSB7XG4gICAgdmFyIEJhc2UgPSByZXF1aXJlKFwiLi9iYXNlL2luZGV4LmpzXCIpO1xuICAgIC8qKlxuICAgICAqIEBlbnVtIHtzdHJpbmd9XG4gICAgICovXG4gICAgbnMuVFlQRVMgPSB7XG4gICAgICAgIEFOWTogXCJhbnlcIixcbiAgICAgICAgSU5UOiBcImludFwiLFxuICAgICAgICBOVU1CRVI6IFwibnVtYmVyXCIsXG4gICAgICAgIEJPT0xFQU46IFwiYm9vbGVhblwiLFxuICAgICAgICBPQkpFQ1Q6IFwib2JqZWN0XCIsXG4gICAgICAgIEFSUkFZOiBcImFycmF5XCIsXG4gICAgICAgIE5VTEw6IFwibnVsbFwiLFxuICAgICAgICBVTkRFRklORUQ6IFwidW5kZWZpbmVkXCIsXG4gICAgICAgIEZVTkNUSU9OOiBcImZ1bmN0aW9uXCIsXG4gICAgICAgIFNUUklORzogXCJzdHJpbmdcIlxuICAgIH1cblxuICAgIG5zLk9CSkVDVF9LSU5EUyA9IHtcbiAgICAgICAgQU5ZOiBcImFueVwiLFxuICAgICAgICBGTE9BVDI6IFwiZmxvYXQyXCIsIC8vIHZpcnR1YWwga2luZHNcbiAgICAgICAgRkxPQVQzOiBcImZsb2F0M1wiLCAvLyB2aXJ0dWFsIGtpbmRzXG4gICAgICAgIEZMT0FUNDogXCJmbG9hdDRcIiwgLy8gdmlydHVhbCBraW5kc1xuICAgICAgICBOT1JNQUw6IFwibm9ybWFsXCIsXG4gICAgICAgIE1BVFJJWDQ6IFwibWF0cml4NFwiLFxuICAgICAgICBNQVRSSVgzOiBcIm1hdHJpeDNcIixcbiAgICAgICAgQ09MT1JfQ0xPU1VSRTogXCJjb2xvcl9jbG9zdXJlXCJcbiAgICB9XG5cbiAgICBucy5TT1VSQ0VTID0ge1xuICAgICAgICBVTklGT1JNOiBcInVuaWZvcm1cIixcbiAgICAgICAgVkVSVEVYOiBcInZlcnRleFwiLFxuICAgICAgICBDT05TVEFOVDogXCJjb25zdGFudFwiXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZmlsbFZlY3RvcihkZXN0LCB2ZWNTaXplLCBhcmd1bWVudHMpe1xuICAgICAgICB2YXIgY29sb3IgPSBmYWxzZTtcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwICl7XG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgdmVjU2l6ZTsgKytpKVxuICAgICAgICAgICAgICAgIGRlc3RbaV0gPSAwO1xuICAgICAgICAgICAgaWYoY29sb3IpIGRlc3RbM10gPSAxO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMSAmJiAhaXNOYU4oYXJndW1lbnRzWzBdKSl7XG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgdmVjU2l6ZTsgKytpKVxuICAgICAgICAgICAgICAgIGRlc3RbaV0gPSBhcmd1bWVudHNbMF07XG4gICAgICAgICAgICBpZihjb2xvcikgZGVzdFszXSA9IDE7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaWR4ID0gMDtcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaWR4IDwgdmVjU2l6ZSAmJiBpIDwgYXJndW1lbnRzLmxlbmd0aDsgKytpKXtcbiAgICAgICAgICAgIHZhciBhcmc9IGFyZ3VtZW50c1tpXSwgY250ID0gMTtcbiAgICAgICAgICAgIGlmKGFyZyBpbnN0YW5jZW9mIFZlYzIpIGNudCA9IDI7XG4gICAgICAgICAgICBlbHNlIGlmKGFyZyBpbnN0YW5jZW9mIFZlYzMpIGNudCA9IDM7XG4gICAgICAgICAgICBlbHNlIGlmKGFyZyBpbnN0YW5jZW9mIFZlYzQpIGNudCA9IDQ7XG5cbiAgICAgICAgICAgIGlmKGNudCA9PSAxKVxuICAgICAgICAgICAgICAgIGRlc3RbaWR4KytdID0gYXJnIHx8IDA7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgZm9yKHZhciBqID0gMDsgaWR4IDwgdmVjU2l6ZSAmJiBqIDwgY250OyArK2ope1xuICAgICAgICAgICAgICAgICAgICBkZXN0W2lkeCsrXSA9IGFyZ1tqXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYoaSA8IGFyZ3VtZW50cy5sZW5ndGgpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUb28gbWFueSBhcmd1bWVudHMgZm9yIFwiICsgKGNvbG9yID8gXCJDb2xvclwiIDogXCJWZWNcIiArIHZlY1NpemUpICsgXCIuXCIpO1xuICAgICAgICBpZihpZHggPCB2ZWNTaXplKXtcbiAgICAgICAgICAgIGlmKGNvbG9yICYmIChpZHggPT0gMykpXG4gICAgICAgICAgICAgICAgZGVzdFszXSA9IDE7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IGVub3VnaCBhcmd1bWVudHMgZm9yIFwiICsgKGNvbG9yID8gXCJDb2xvclwiIDogXCJWZWNcIiArIHZlY1NpemUpICsgXCIuXCIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICAvLyBUT0RPOiBHZW5lcmF0ZSBTd2l6emxlIGZ1bmN0aW9uc1xuICAgIHZhciBTV0laWkxFX0tFWVMgPSBbXG4gICAgICAgIFsneCcsJ3knLCd6JywndyddLFxuICAgICAgICBbJ3InLCAnZycsICdiJywgJ2EnXSxcbiAgICAgICAgWydzJywgJ3QnLCAncCcsICdxJ11cbiAgICBdXG5cbiAgICBmdW5jdGlvbiBhZGRTd2l6emxlcyhwcm90b3R5cGUsIHZlY0NvdW50LCBtYXNrQ291bnQsIHdpdGhTZXR0ZXIpe1xuICAgICAgICB2YXIgbWF4ID0gTWF0aC5wb3codmVjQ291bnQsIG1hc2tDb3VudCk7XG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBtYXg7ICsraSl7XG4gICAgICAgICAgICB2YXIgaW5kaWNlcyA9IFtdLCBrZXlzID0gW1wiXCIsIFwiXCIsIFwiXCJdLCB2YWwgPSBpLCBhcmdzID0gW107XG4gICAgICAgICAgICB2YXIgc2V0dGVyQXJncyA9IFtdLCBnZW5lcmF0ZVNldHRlciA9IHdpdGhTZXR0ZXI7XG4gICAgICAgICAgICBmb3IodmFyIGogPSAwOyBqIDwgbWFza0NvdW50OyArK2ope1xuICAgICAgICAgICAgICAgIHZhciBpZHggPSB2YWwgJSB2ZWNDb3VudDtcbiAgICAgICAgICAgICAgICBpbmRpY2VzLnB1c2goaWR4KTtcbiAgICAgICAgICAgICAgICBpZihnZW5lcmF0ZVNldHRlcil7XG4gICAgICAgICAgICAgICAgICAgIGlmKHNldHRlckFyZ3NbaWR4XSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0dGVyQXJnc1tpZHhdID0gJ290aGVyWycgKyBqICsgJ10nO1xuICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICBnZW5lcmF0ZVNldHRlciA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IodmFyIGsgPSAwOyBrIDwgU1dJWlpMRV9LRVlTLmxlbmd0aDsgKytrKXtcbiAgICAgICAgICAgICAgICAgICAga2V5c1trXSArPSBTV0laWkxFX0tFWVNba11baWR4XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFsID0gTWF0aC5mbG9vcih2YWwgLyB2ZWNDb3VudCk7XG4gICAgICAgICAgICAgICAgYXJncy5wdXNoKCd0aGlzWycrIGlkeCArICddJyApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZnVuY0FyZ3MgPSBcIlwiO1xuICAgICAgICAgICAgdmFyIGJvZHkgPSAnICByZXR1cm4gZ2V0VmVjJyArIG1hc2tDb3VudCArICcuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcXG4nO1xuICAgICAgICAgICAgaWYoZ2VuZXJhdGVTZXR0ZXIpe1xuICAgICAgICAgICAgICAgIGZvcih2YXIgaiA9IDA7IGogPCB2ZWNDb3VudDsgKytqKXtcbiAgICAgICAgICAgICAgICAgICAgaWYoc2V0dGVyQXJnc1tqXSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0dGVyQXJnc1tqXSA9ICd0aGlzWycgKyBqICsgJ10nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzd2l0Y2gobWFza0NvdW50KXtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAyIDogZnVuY0FyZ3MgPSBcIngsIHlcIjsgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMyA6IGZ1bmNBcmdzID0gXCJ4LCB5LCB6XCI7IGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDQgOiBmdW5jQXJncyA9IFwieCwgeSwgeiwgd1wiOyBicmVhaztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBib2R5ID0gXCIgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcXG4gIFwiICsgYm9keSArXG4gICAgICAgICAgICAgICAgICAgICAgIFwiICBlbHNle1xcblwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgXCIgICAgdmFyIG90aGVyPWdldFZlY1wiICsgbWFza0NvdW50ICsgJy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICBcIiAgICByZXR1cm4gZ2V0VmVjXCIgKyB2ZWNDb3VudCArICcoJyArIHNldHRlckFyZ3Muam9pbihcIiwgXCIpICsgJyk7XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgIFwiICB9XFxuXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgZnVuY3Rpb25Db2RlID0gJ2Z1bmN0aW9uKCcgKyBmdW5jQXJncyArICAnKXtcXG4nICsgYm9keSArICd9JztcbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gZXZhbChcIihcIiArIGZ1bmN0aW9uQ29kZSArIFwiKVwiKTtcbiAgICAgICAgICAgICAgICBmb3IodmFyIGogPSAwOyBqIDwga2V5cy5sZW5ndGg7ICsrailcbiAgICAgICAgICAgICAgICAgICAgcHJvdG90eXBlW2tleXNbal1dID0gcmVzdWx0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2goZSl7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yIENvbXBpbGluZyBDb2RlOlxcblwiICsgZnVuY3Rpb25Db2RlKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xuXG4gICAgICAgICAgICB9XG5cblxuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBUaGUgdmlydHVhbCBWZWMyIHR5cGVcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICAgdmFyIFZlYzIgPSBmdW5jdGlvbih4LCB5KXtcbiAgICAgICAgZmlsbFZlY3Rvcih0aGlzLCAyLCBhcmd1bWVudHMpO1xuICAgICB9XG5cblxuICAgICBmdW5jdGlvbiBnZXRWZWMyKCl7XG4gICAgICAgIGlmKGFyZ3VtZW50c1swXSBpbnN0YW5jZW9mIFZlYzIpXG4gICAgICAgICAgICByZXR1cm4gYXJndW1lbnRzWzBdO1xuICAgICAgICB2YXIgb2JqID0gIG5ldyBWZWMyKCk7XG4gICAgICAgIFZlYzIuYXBwbHkob2JqLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICB9XG5cbiAgICAgVmVjMi5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24oeCwgeSl7IC8vIDAgYXJndW1lbnRzID0+IGlkZW50aXR5IG9yIGVycm9yP1xuICAgICAgICB2YXIgYWRkID0gZ2V0VmVjMi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpc1swXSArIGFkZFswXSwgdGhpc1sxXSArIGFkZFsxXSk7XG4gICAgIH1cbiAgICAgVmVjMi5wcm90b3R5cGUuc3ViID0gZnVuY3Rpb24oeCwgeSl7XG4gICAgICAgIHZhciBzdWIgPSBnZXRWZWMyLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzWzBdIC0gc3ViWzBdLCB0aGlzWzFdIC0gc3ViWzFdKTtcbiAgICAgfVxuICAgICBWZWMyLnByb3RvdHlwZS5tdWwgPSBmdW5jdGlvbih4LCB5KXtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjMi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpc1swXSAqIG90aGVyWzBdLCB0aGlzWzFdICogb3RoZXJbMV0pO1xuICAgICB9XG4gICAgIFZlYzIucHJvdG90eXBlLmRpdiA9IGZ1bmN0aW9uKHgsIHkpe1xuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWMyLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzWzBdIC8gb3RoZXJbMF0sIHRoaXNbMV0gLyBvdGhlclsxXSk7XG4gICAgIH1cbiAgICAgVmVjMi5wcm90b3R5cGUubW9kID0gZnVuY3Rpb24oeCwgeSl7XG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzIuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXNbMF0gJSBvdGhlclswXSwgdGhpc1sxXSAlIG90aGVyWzFdKTtcbiAgICAgfVxuICAgICBWZWMyLnByb3RvdHlwZS5kb3QgPSBmdW5jdGlvbih4LCB5KXtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjMi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gdGhpc1swXSpvdGhlclswXSArIHRoaXNbMV0qb3RoZXJbMV07XG4gICAgIH1cbiAgICAgVmVjMi5wcm90b3R5cGUuYWJzID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKE1hdGguYWJzKHRoaXNbMF0pLCBNYXRoLmFicyh0aGlzWzFdKSk7XG4gICAgIH1cbiAgICAgVmVjMi5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24obGVuZ3RoKXtcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxuICAgICAgICAgICAgcmV0dXJuIE1hdGguc3FydCh0aGlzLmRvdCh0aGlzKSk7XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tdWwobGVuZ3RoIC8gdGhpcy5sZW5ndGgoKSk7XG4gICAgICAgIH1cbiAgICAgfVxuICAgICBWZWMyLnByb3RvdHlwZS5ub3JtYWxpemUgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gdGhpcy5sZW5ndGgoMSk7XG4gICAgIH1cblxuICAgICBWZWMyLnByb3RvdHlwZS54eSA9IFZlYzIucHJvdG90eXBlLnJnID0gVmVjMi5wcm90b3R5cGUuc3QgPSBmdW5jdGlvbih4LHkpe1xuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHJldHVybiBnZXRWZWMyLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIH1cbiAgICAgfVxuICAgICBWZWMyLnByb3RvdHlwZS54ID0gVmVjMi5wcm90b3R5cGUuciA9IFZlYzIucHJvdG90eXBlLnMgPSBmdW5jdGlvbih4KXtcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXNbMF07XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnh5KHgsIHRoaXNbMV0pO1xuICAgICB9XG4gICAgIFZlYzIucHJvdG90eXBlLnkgPSBWZWMyLnByb3RvdHlwZS5nID0gVmVjMi5wcm90b3R5cGUudCA9IGZ1bmN0aW9uKHkpe1xuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXG4gICAgICAgICAgICByZXR1cm4gdGhpc1sxXTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMueHkodGhpc1swXSwgeSk7XG4gICAgIH1cblxuICAgICBhZGRTd2l6emxlcyhWZWMyLnByb3RvdHlwZSwgMiwgMiwgdHJ1ZSk7XG4gICAgIGFkZFN3aXp6bGVzKFZlYzIucHJvdG90eXBlLCAyLCAzLCBmYWxzZSk7XG4gICAgIGFkZFN3aXp6bGVzKFZlYzIucHJvdG90eXBlLCAyLCA0LCBmYWxzZSk7XG5cblxuXG4gICAgIC8qKlxuICAgICAgKiBUaGUgdmlydHVhbCBWZWMzIHR5cGVcbiAgICAgICogQGNvbnN0cnVjdG9yXG4gICAgICAqL1xuICAgICB2YXIgVmVjMyA9IGZ1bmN0aW9uKHgsIHksIHogKXtcbiAgICAgICAgZmlsbFZlY3Rvcih0aGlzLCAzLCBhcmd1bWVudHMpO1xuICAgICB9XG5cbiAgICAgZnVuY3Rpb24gZ2V0VmVjMygpe1xuICAgICAgICBpZihhcmd1bWVudHNbMF0gaW5zdGFuY2VvZiBWZWMzKVxuICAgICAgICAgICAgcmV0dXJuIGFyZ3VtZW50c1swXTtcbiAgICAgICAgdmFyIG9iaiA9IG5ldyBWZWMzKCk7XG4gICAgICAgIFZlYzMuYXBwbHkob2JqLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICB9XG5cbiAgICAgVmVjMy5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24oeCwgeSwgeil7XG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzMuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHRoaXNbMF0gKyBvdGhlclswXSwgdGhpc1sxXSArIG90aGVyWzFdLCB0aGlzWzJdICsgb3RoZXJbMl0pO1xuICAgICB9XG4gICAgIFZlYzMucHJvdG90eXBlLnN1YiA9IGZ1bmN0aW9uKHgsIHksIHope1xuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWMzLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzWzBdIC0gb3RoZXJbMF0sIHRoaXNbMV0gLSBvdGhlclsxXSwgdGhpc1syXSAtIG90aGVyWzJdKTtcbiAgICAgfVxuICAgICBWZWMzLnByb3RvdHlwZS5tdWwgPSBmdW5jdGlvbih4LCB5LCB6KXtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjMy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpc1swXSAqIG90aGVyWzBdLCB0aGlzWzFdICogb3RoZXJbMV0sIHRoaXNbMl0gKiBvdGhlclsyXSk7XG4gICAgIH1cbiAgICAgVmVjMy5wcm90b3R5cGUuZGl2ID0gZnVuY3Rpb24oeCwgeSwgeil7XG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzMuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHRoaXNbMF0gLyBvdGhlclswXSwgdGhpc1sxXSAvIG90aGVyWzFdLCB0aGlzWzJdIC8gb3RoZXJbMl0pO1xuICAgICB9XG4gICAgIFZlYzMucHJvdG90eXBlLm1vZCA9IGZ1bmN0aW9uKHgsIHksIHope1xuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWMzLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzWzBdICUgb3RoZXJbMF0sIHRoaXNbMV0gJSBvdGhlclsxXSwgdGhpc1syXSAlIG90aGVyWzJdKTtcbiAgICAgfVxuICAgICBWZWMzLnByb3RvdHlwZS5hYnMgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gbmV3IFZlYzMoTWF0aC5hYnModGhpc1swXSksIE1hdGguYWJzKHRoaXNbMV0pLCBNYXRoLmFicyh0aGlzWzJdKSk7XG4gICAgIH1cbiAgICAgVmVjMy5wcm90b3R5cGUuZG90ID0gZnVuY3Rpb24oeCwgeSwgeil7XG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzMuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIHRoaXNbMF0qb3RoZXJbMF0gKyB0aGlzWzFdKm90aGVyWzFdICsgdGhpc1syXSpvdGhlclsyXTtcbiAgICAgfVxuICAgICBWZWMzLnByb3RvdHlwZS5jcm9zcyA9IGZ1bmN0aW9uKHgsIHksIHope1xuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWMzLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHZhciB4ID0gdGhpc1sxXSpvdGhlclsyXSAtIG90aGVyWzFdKnRoaXNbMl07XG4gICAgICAgIHZhciB5ID0gdGhpc1syXSpvdGhlclswXSAtIG90aGVyWzJdKnRoaXNbMF07XG4gICAgICAgIHZhciB6ID0gdGhpc1swXSpvdGhlclsxXSAtIG90aGVyWzBdKnRoaXNbMV07XG4gICAgICAgIHJldHVybiBuZXcgVmVjMyh4LCB5LCB6KTtcbiAgICAgfVxuICAgICBWZWMzLnByb3RvdHlwZS5sZW5ndGggPSBmdW5jdGlvbihsZW5ndGgpe1xuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXG4gICAgICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMuZG90KHRoaXMpKTtcbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm11bChsZW5ndGggLyB0aGlzLmxlbmd0aCgpKTtcbiAgICAgICAgfVxuICAgICB9XG4gICAgIFZlYzMucHJvdG90eXBlLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiB0aGlzLmxlbmd0aCgxKTtcbiAgICAgfVxuICAgICBWZWMzLnByb3RvdHlwZS54eXogPSBWZWMzLnByb3RvdHlwZS5yZ2IgPSBWZWMzLnByb3RvdHlwZS5zdHAgPSBmdW5jdGlvbih4LCB5LCB6KXtcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiBuZXcgVmVjMyh4LCB5LCB6KTtcbiAgICAgfVxuICAgICBWZWMzLnByb3RvdHlwZS54ID0gVmVjMy5wcm90b3R5cGUuciA9IFZlYzMucHJvdG90eXBlLnMgPSBmdW5jdGlvbih4KXtcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXNbMF07XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiBuZXcgVmVjMyh4LCB0aGlzWzFdLCB0aGlzWzJdKTtcbiAgICAgfVxuICAgICBWZWMzLnByb3RvdHlwZS55ID0gVmVjMy5wcm90b3R5cGUuZyA9IFZlYzMucHJvdG90eXBlLnQgPSBmdW5jdGlvbih5KXtcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXNbMV07XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzWzBdLCB5LCB0aGlzWzJdKTtcbiAgICAgfVxuICAgICBWZWMzLnByb3RvdHlwZS56ID0gVmVjMy5wcm90b3R5cGUuYiA9IFZlYzMucHJvdG90eXBlLnAgPSBmdW5jdGlvbih6KXtcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXNbMl07XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzWzBdLCB0aGlzWzFdLCB6KTtcbiAgICAgfVxuICAgICBhZGRTd2l6emxlcyhWZWMzLnByb3RvdHlwZSwgMywgMiwgdHJ1ZSk7XG4gICAgIGFkZFN3aXp6bGVzKFZlYzMucHJvdG90eXBlLCAzLCAzLCB0cnVlKTtcbiAgICAgYWRkU3dpenpsZXMoVmVjMy5wcm90b3R5cGUsIDMsIDQsIGZhbHNlKTtcblxuXG4gICAgIC8qKlxuICAgICAgKiBUaGUgdmlydHVhbCBWZWM0IHR5cGVcbiAgICAgICogQGNvbnN0cnVjdG9yXG4gICAgICAqL1xuICAgICB2YXIgVmVjNCA9IGZ1bmN0aW9uKHgsIHksIHosIHcgKXtcbiAgICAgICAgZmlsbFZlY3Rvcih0aGlzLCA0LCBhcmd1bWVudHMpXG4gICAgIH1cblxuICAgICBmdW5jdGlvbiBnZXRWZWM0KCl7XG4gICAgICAgIGlmKGFyZ3VtZW50c1swXSBpbnN0YW5jZW9mIFZlYzQpXG4gICAgICAgICAgICByZXR1cm4gYXJndW1lbnRzWzBdO1xuICAgICAgICB2YXIgb2JqID0gbmV3IFZlYzQoKTtcbiAgICAgICAgVmVjNC5hcHBseShvYmosIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgIH1cblxuICAgICBWZWM0LnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbih4LCB5LCB6LCB3KXtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjNC5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpc1swXSArIG90aGVyWzBdLCB0aGlzWzFdICsgb3RoZXJbMV0sIHRoaXNbMl0gKyBvdGhlclsyXSwgdGhpc1szXSArIG90aGVyWzNdKTtcbiAgICAgfVxuICAgICBWZWM0LnByb3RvdHlwZS5zdWIgPSBmdW5jdGlvbih4LCB5LCB6LCB3KXtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjNC5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpc1swXSAtIG90aGVyWzBdLCB0aGlzWzFdIC0gb3RoZXJbMV0sIHRoaXNbMl0gLSBvdGhlclsyXSwgdGhpc1szXSAtIG90aGVyWzNdKTtcbiAgICAgfVxuICAgICBWZWM0LnByb3RvdHlwZS5tdWwgPSBmdW5jdGlvbih4LCB5LCB6LCB3KXtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjNC5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpc1swXSAqIG90aGVyWzBdLCB0aGlzWzFdICogb3RoZXJbMV0sIHRoaXNbMl0gKiBvdGhlclsyXSwgdGhpc1szXSAqIG90aGVyWzNdKTtcbiAgICAgfVxuICAgICBWZWM0LnByb3RvdHlwZS5kaXYgPSBmdW5jdGlvbih4LCB5LCB6LCB3KXtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjNC5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpc1swXSAvIG90aGVyWzBdLCB0aGlzWzFdIC8gb3RoZXJbMV0sIHRoaXNbMl0gLyBvdGhlclsyXSwgdGhpc1szXSAvIG90aGVyWzNdKTtcbiAgICAgfVxuICAgICBWZWM0LnByb3RvdHlwZS5tb2QgPSBmdW5jdGlvbih4LCB5LCB6LCB3KXtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjNC5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpc1swXSAlIG90aGVyWzBdLCB0aGlzWzFdICUgb3RoZXJbMV0sIHRoaXNbMl0gJSBvdGhlclsyXSwgdGhpc1szXSAlIG90aGVyWzNdKTtcbiAgICAgfVxuICAgICBWZWM0LnByb3RvdHlwZS5hYnMgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gbmV3IFZlYzQoTWF0aC5hYnModGhpc1swXSksIE1hdGguYWJzKHRoaXNbMV0pLCBNYXRoLmFicyh0aGlzWzJdKSwgTWF0aC5hYnModGhpc1szXSkpO1xuICAgICB9XG4gICAgIFZlYzQucHJvdG90eXBlLmRvdCA9IGZ1bmN0aW9uKHgsIHksIHosIHcpe1xuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWM0LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiB0aGlzWzBdKm90aGVyWzBdICsgdGhpc1sxXSpvdGhlclsxXSArIHRoaXNbMl0qb3RoZXJbMl0gKyB0aGlzWzNdKm90aGVyWzNdO1xuICAgICB9XG4gICAgIFZlYzQucHJvdG90eXBlLmxlbmd0aCA9IGZ1bmN0aW9uKGxlbmd0aCl7XG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcbiAgICAgICAgICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy5kb3QodGhpcykpO1xuICAgICAgICBlbHNle1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubXVsKGxlbmd0aCAvIHRoaXMubGVuZ3RoKCkpO1xuICAgICAgICB9XG4gICAgIH1cbiAgICAgVmVjNC5wcm90b3R5cGUubm9ybWFsaXplID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIHRoaXMubGVuZ3RoKDEpO1xuICAgICB9XG4gICAgIFZlYzQucHJvdG90eXBlLnh5encgPSBWZWM0LnByb3RvdHlwZS5yZ2JhID0gVmVjNC5wcm90b3R5cGUuc3RwcSA9IGZ1bmN0aW9uKHgsIHksIHosIHcpe1xuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIGdldFZlYzQuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgfVxuICAgICBWZWM0LnByb3RvdHlwZS54ID0gVmVjNC5wcm90b3R5cGUuciA9IFZlYzQucHJvdG90eXBlLnMgPSBmdW5jdGlvbih4KXtcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXNbMF07XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiBnZXRWZWM0KHgsIHRoaXNbMV0sIHRoaXNbMl0sIHRoaXNbM10pO1xuICAgICB9XG5cbiAgICAgVmVjNC5wcm90b3R5cGUueSA9IFZlYzQucHJvdG90eXBlLmcgPSBWZWM0LnByb3RvdHlwZS50ID0gZnVuY3Rpb24oeSl7XG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcbiAgICAgICAgICAgIHJldHVybiB0aGlzWzFdO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4gZ2V0VmVjNCh0aGlzWzBdLCB5LCB0aGlzWzJdLCB0aGlzWzNdKTtcbiAgICAgfVxuICAgICBWZWM0LnByb3RvdHlwZS56ID0gVmVjNC5wcm90b3R5cGUuYiA9IFZlYzQucHJvdG90eXBlLnAgPSBmdW5jdGlvbih6KXtcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXNbMl07XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiBnZXRWZWM0KHRoaXNbMF0sIHRoaXNbMV0sIHosIHRoaXNbM10pO1xuICAgICB9XG4gICAgIFZlYzQucHJvdG90eXBlLncgPSBWZWM0LnByb3RvdHlwZS5hID0gVmVjNC5wcm90b3R5cGUucSA9IGZ1bmN0aW9uKHcpe1xuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXG4gICAgICAgICAgICByZXR1cm4gdGhpc1szXTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIGdldFZlYzQodGhpc1swXSwgdGhpc1sxXSx0aGlzWzJdLCB3ICk7XG4gICAgIH1cbiAgICAgYWRkU3dpenpsZXMoVmVjNC5wcm90b3R5cGUsIDQsIDIsIHRydWUpO1xuICAgICBhZGRTd2l6emxlcyhWZWM0LnByb3RvdHlwZSwgNCwgMywgdHJ1ZSk7XG4gICAgIGFkZFN3aXp6bGVzKFZlYzQucHJvdG90eXBlLCA0LCA0LCB0cnVlKTtcblxuICAgICAvKipcbiAgICAgICogVGhlIHZpcnR1YWwgQ29sb3IgdHlwZVxuICAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgICovXG4gICAgIHZhciBDb2xvciA9IFZlYzQ7XG5cbiAgICB2YXIgU2hhZGUgPSB7fTtcblxuICAgIFNoYWRlLmNsYW1wID0gZnVuY3Rpb24oeCwgbWluVmFsLCBtYXhWYWwpIHtcbiAgICAgICAgcmV0dXJuIE1hdGgubWluKE1hdGgubWF4KHgsIG1pblZhbCksIG1heFZhbCk7XG4gICAgfTtcblxuICAgIFNoYWRlLnNtb290aHN0ZXAgPSBmdW5jdGlvbihlZGdlMSwgZWRnZTIsIHgpIHtcbiAgICAgICAgdmFyIHQgPSBTaGFkZS5jbGFtcCgoeCAtIGVkZ2UxKSAvIChlZGdlMiAtIGVkZ2UxKSwgMC4wLCAxLjApO1xuICAgICAgICByZXR1cm4gdCAqIHQgKiAoMy4wIC0gMi4wICogdCk7XG4gICAgfTtcblxuICAgIFNoYWRlLnN0ZXAgPSBmdW5jdGlvbihlZGdlLCB4KSB7XG4gICAgICAgIHJldHVybiB4IDwgZWRnZSA/IDAgOiAxO1xuICAgIH07XG5cbiAgICBTaGFkZS5mcmFjdCA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgcmV0dXJuIHggLSBNYXRoLmZsb29yKHgpO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG5vZGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbXNnXG4gICAgICovXG4gICAgbnMudGhyb3dFcnJvciA9IGZ1bmN0aW9uKG5vZGUsIG1zZykge1xuICAgICAgICB2YXIgbG9jID0gbm9kZSAmJiBub2RlLmxvYztcbiAgICAgICAgaWYgKGxvYyAmJiBsb2Muc3RhcnQubGluZSkge1xuICAgICAgICAgICAgbXNnID0gXCJMaW5lIFwiICsgbG9jLnN0YXJ0LmxpbmUgKyBcIjogXCIgKyBtc2c7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGVycm9yID0gbmV3IEVycm9yKG1zZyk7XG4gICAgICAgIGVycm9yLmxvYyA9IGxvYztcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuXG4gICAgbnMuVmVjMiA9IFZlYzI7XG4gICAgbnMuVmVjMyA9IFZlYzM7XG4gICAgbnMuVmVjNCA9IFZlYzQ7XG4gICAgbnMuQ29sb3IgPSBDb2xvcjtcbiAgICBucy5TaGFkZSA9IFNoYWRlO1xuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbiAobnMpIHtcbiAgICB2YXIgcGFyc2VyID0gcmVxdWlyZSgnZXNwcmltYScpLFxuICAgICAgICBwYXJhbWV0ZXJzID0gcmVxdWlyZShcIi4vYW5hbHl6ZS9wYXJhbWV0ZXJzLmpzXCIpLFxuICAgICAgICBpbnRlcmZhY2VzID0gcmVxdWlyZShcIi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgaW5mZXJlbmNlID0gcmVxdWlyZShcIi4vYW5hbHl6ZS90eXBlaW5mZXJlbmNlL3R5cGVpbmZlcmVuY2UuanNcIiksXG4gICAgICAgIEJhc2UgPSByZXF1aXJlKFwiLi9iYXNlL2luZGV4LmpzXCIpLFxuICAgICAgICBHTFNMQ29tcGlsZXIgPSByZXF1aXJlKFwiLi9nZW5lcmF0ZS9nbHNsL2NvbXBpbGVyLmpzXCIpLkdMU0xDb21waWxlcjtcblxuXG5cbiAgICBCYXNlLmV4dGVuZChucywge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBbmFseXplcyBhIGphdmFzY3JpcHQgcHJvZ3JhbSBhbmQgcmV0dXJucyBhIGxpc3Qgb2YgcGFyYW1ldGVyc1xuICAgICAgICAgKiBAcGFyYW0ge2Z1bmN0aW9uKCl8c3RyaW5nKSBmdW5jXG4gICAgICAgICAqIEByZXR1cm5zIHtvYmplY3QhfVxuICAgICAgICAgKi9cbiAgICAgICAgZXh0cmFjdFBhcmFtZXRlcnM6IGZ1bmN0aW9uIChmdW5jLCBvcHQpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZnVuYyA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgZnVuYyA9IGZ1bmMudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBhc3QgPSBwYXJzZXIucGFyc2UoZnVuYyk7XG5cbiAgICAgICAgICAgIHJldHVybiBwYXJhbWV0ZXJzLmV4dHJhY3RQYXJhbWV0ZXJzKGFzdCwgb3B0KTtcbiAgICAgICAgfSxcblxuICAgICAgICBwYXJzZUFuZEluZmVyZW5jZUV4cHJlc3Npb246IGZ1bmN0aW9uIChzdHIsIG9wdCkge1xuICAgICAgICAgICAgb3B0ID0gb3B0IHx8IHt9O1xuICAgICAgICAgICAgdmFyIGFzdCA9IHBhcnNlci5wYXJzZShzdHIsIHtyYXc6IHRydWUsIGxvYzogb3B0LmxvYyB8fCBmYWxzZSB9KTtcbiAgICAgICAgICAgIHZhciBhYXN0ID0gaW5mZXJlbmNlLmluZmVyKGFzdCwgb3B0KTtcbiAgICAgICAgICAgIHJldHVybiBhYXN0O1xuICAgICAgICB9LFxuXG4gICAgICAgIGNvbXBpbGVGcmFnbWVudFNoYWRlcjogZnVuY3Rpb24oYWFzdCl7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEdMU0xDb21waWxlcigpLmNvbXBpbGVGcmFnbWVudFNoYWRlcihhYXN0KTtcbiAgICAgICAgfSxcblxuICAgICAgICBUWVBFUyA6IGludGVyZmFjZXMuVFlQRVMsXG4gICAgICAgIE9CSkVDVF9LSU5EUyA6IGludGVyZmFjZXMuT0JKRUNUX0tJTkRTLFxuICAgICAgICBTT1VSQ0VTOiBpbnRlcmZhY2VzLlNPVVJDRVMsXG4gICAgICAgIFZlYzI6IGludGVyZmFjZXMuVmVjMixcbiAgICAgICAgVmVjMzogaW50ZXJmYWNlcy5WZWMzLFxuICAgICAgICBWZWM0OiBpbnRlcmZhY2VzLlZlYzQsXG4gICAgICAgIENvbG9yOiBpbnRlcmZhY2VzLkNvbG9yXG5cbn0pO1xuICAgIC8qKlxuICAgICAqIExpYnJhcnkgdmVyc2lvbjpcbiAgICAgKi9cbiAgICBucy52ZXJzaW9uID0gJzAuMC4xJztcblxufShleHBvcnRzKSk7XG4iXX0=
;