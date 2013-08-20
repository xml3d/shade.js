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
                    console.error("No object info for: ", object);
                    return;
                }

                var objectInfo = ctx.getObjectInfoFor(objectReference);
                if(!objectInfo) { // Every object needs an info, otherwise we did something wrong
                    console.error("No object registered for: ", objectReference.getTypeString(), JSON.stringify(node.object));
                    return;
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
            if (args.length == 0)
                return node.callee;
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
            ctx.declareVariable("__sys_normalizedCoords", false);
            ctx.updateExpression("__sys_normalizedCoords", new TypeInfo({
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
                console.error("No object info for: ", object);
                return;
            }

            var objectInfo = context.getObjectInfoFor(objectReference);
            if(!objectInfo) { // Every object needs an info, otherwise we did something wrong
                console.error("No object registered for: ", objectReference.getTypeString(), JSON.stringify(callExpression.callee));
                return;
                //Shade.throwError(callExpression, "Internal: No registration for object: " + objectReference.getTypeString() + ", " + JSON.stringify(callExpression.object));
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
                console.error("No object registered for: ", objectReference.getTypeString(), JSON.stringify(memberExpression.object))
                //Shade.throwError(memberExpression, "Internal: No registration for object: " + objectReference.getTypeString() + ", " + JSON.stringify(memberExpression.object));
                return;
            }
            if (objectInfo.hasOwnProperty(propertyName)) {
                var propertyHandler = objectInfo[propertyName];
                if (typeof propertyHandler.property == "function") {
                    return propertyHandler.property(memberExpression, parent, context, state);
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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXGJ1aWxkXFxzaGFkZS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcaW5kZXguanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXG5vZGVfbW9kdWxlc1xcZXNwcmltYVxcZXNwcmltYS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcbm9kZV9tb2R1bGVzXFxlc3RyYXZlcnNlXFxlc3RyYXZlcnNlLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGFuYWx5emVcXHBhcmFtZXRlcnMuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxcaW5mZXJfZXhwcmVzc2lvbi5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxpbmZlcl9zdGF0ZW1lbnQuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXGNvbG9yY2xvc3VyZS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxyZWdpc3RyeVxcaW5kZXguanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXG1hdGguanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXG1hdHJpeC5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxyZWdpc3RyeVxcc2hhZGUuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXHN5c3RlbS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxyZWdpc3RyeVxcdG9vbHMuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXHZlYzIuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXHZlYzMuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXHZlYzQuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxcdHlwZWluZmVyZW5jZS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxiYXNlXFxhbm5vdGF0aW9uLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGJhc2VcXGNvbnRleHQuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYmFzZVxcaW5kZXguanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYmFzZVxcdHlwZWluZm8uanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYmFzZVxcdmVjLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxjb21waWxlci5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxcZ2xzbC1nZW5lcmF0ZS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXGNvbG9yY2xvc3VyZS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXGluZGV4LmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxyZWdpc3RyeVxcbWF0aC5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXHNoYWRlLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxyZWdpc3RyeVxcc3lzdGVtLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxyZWdpc3RyeVxcdG9vbHMuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcZ2VuZXJhdGVcXGdsc2xcXHJlZ2lzdHJ5XFx2ZWMyLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxyZWdpc3RyeVxcdmVjMy5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXHZlYzQuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcZ2VuZXJhdGVcXGdsc2xcXHRyYW5zZm9ybS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxpbnRlcmZhY2VzLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXHNoYWRlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwMEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxZ0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNVFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdFRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDektBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwY0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNWJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gKCkge1xuICAgIHZhciBnbG9iYWwgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHt9O1xuICAgIGdsb2JhbC5TaGFkZSA9IHJlcXVpcmUoXCIuLi9pbmRleC5qc1wiKTtcbn0oKSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vc3JjL3NoYWRlLmpzJyk7IiwiLypcbiAgQ29weXJpZ2h0IChDKSAyMDEyIEFyaXlhIEhpZGF5YXQgPGFyaXlhLmhpZGF5YXRAZ21haWwuY29tPlxuICBDb3B5cmlnaHQgKEMpIDIwMTIgTWF0aGlhcyBCeW5lbnMgPG1hdGhpYXNAcWl3aS5iZT5cbiAgQ29weXJpZ2h0IChDKSAyMDEyIEpvb3N0LVdpbSBCb2VrZXN0ZWlqbiA8am9vc3Qtd2ltQGJvZWtlc3RlaWpuLm5sPlxuICBDb3B5cmlnaHQgKEMpIDIwMTIgS3JpcyBLb3dhbCA8a3Jpcy5rb3dhbEBjaXhhci5jb20+XG4gIENvcHlyaWdodCAoQykgMjAxMiBZdXN1a2UgU3V6dWtpIDx1dGF0YW5lLnRlYUBnbWFpbC5jb20+XG4gIENvcHlyaWdodCAoQykgMjAxMiBBcnBhZCBCb3Jzb3MgPGFycGFkLmJvcnNvc0Bnb29nbGVtYWlsLmNvbT5cbiAgQ29weXJpZ2h0IChDKSAyMDExIEFyaXlhIEhpZGF5YXQgPGFyaXlhLmhpZGF5YXRAZ21haWwuY29tPlxuXG4gIFJlZGlzdHJpYnV0aW9uIGFuZCB1c2UgaW4gc291cmNlIGFuZCBiaW5hcnkgZm9ybXMsIHdpdGggb3Igd2l0aG91dFxuICBtb2RpZmljYXRpb24sIGFyZSBwZXJtaXR0ZWQgcHJvdmlkZWQgdGhhdCB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnMgYXJlIG1ldDpcblxuICAgICogUmVkaXN0cmlidXRpb25zIG9mIHNvdXJjZSBjb2RlIG11c3QgcmV0YWluIHRoZSBhYm92ZSBjb3B5cmlnaHRcbiAgICAgIG5vdGljZSwgdGhpcyBsaXN0IG9mIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmcgZGlzY2xhaW1lci5cbiAgICAqIFJlZGlzdHJpYnV0aW9ucyBpbiBiaW5hcnkgZm9ybSBtdXN0IHJlcHJvZHVjZSB0aGUgYWJvdmUgY29weXJpZ2h0XG4gICAgICBub3RpY2UsIHRoaXMgbGlzdCBvZiBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIgaW4gdGhlXG4gICAgICBkb2N1bWVudGF0aW9uIGFuZC9vciBvdGhlciBtYXRlcmlhbHMgcHJvdmlkZWQgd2l0aCB0aGUgZGlzdHJpYnV0aW9uLlxuXG4gIFRISVMgU09GVFdBUkUgSVMgUFJPVklERUQgQlkgVEhFIENPUFlSSUdIVCBIT0xERVJTIEFORCBDT05UUklCVVRPUlMgXCJBUyBJU1wiXG4gIEFORCBBTlkgRVhQUkVTUyBPUiBJTVBMSUVEIFdBUlJBTlRJRVMsIElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBUSEVcbiAgSU1QTElFRCBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSBBTkQgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0VcbiAgQVJFIERJU0NMQUlNRUQuIElOIE5PIEVWRU5UIFNIQUxMIDxDT1BZUklHSFQgSE9MREVSPiBCRSBMSUFCTEUgRk9SIEFOWVxuICBESVJFQ1QsIElORElSRUNULCBJTkNJREVOVEFMLCBTUEVDSUFMLCBFWEVNUExBUlksIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFU1xuICAoSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFBST0NVUkVNRU5UIE9GIFNVQlNUSVRVVEUgR09PRFMgT1IgU0VSVklDRVM7XG4gIExPU1MgT0YgVVNFLCBEQVRBLCBPUiBQUk9GSVRTOyBPUiBCVVNJTkVTUyBJTlRFUlJVUFRJT04pIEhPV0VWRVIgQ0FVU0VEIEFORFxuICBPTiBBTlkgVEhFT1JZIE9GIExJQUJJTElUWSwgV0hFVEhFUiBJTiBDT05UUkFDVCwgU1RSSUNUIExJQUJJTElUWSwgT1IgVE9SVFxuICAoSU5DTFVESU5HIE5FR0xJR0VOQ0UgT1IgT1RIRVJXSVNFKSBBUklTSU5HIElOIEFOWSBXQVkgT1VUIE9GIFRIRSBVU0UgT0ZcbiAgVEhJUyBTT0ZUV0FSRSwgRVZFTiBJRiBBRFZJU0VEIE9GIFRIRSBQT1NTSUJJTElUWSBPRiBTVUNIIERBTUFHRS5cbiovXG5cbi8qanNsaW50IGJpdHdpc2U6dHJ1ZSBwbHVzcGx1czp0cnVlICovXG4vKmdsb2JhbCBlc3ByaW1hOnRydWUsIGRlZmluZTp0cnVlLCBleHBvcnRzOnRydWUsIHdpbmRvdzogdHJ1ZSxcbnRocm93RXJyb3I6IHRydWUsIGNyZWF0ZUxpdGVyYWw6IHRydWUsIGdlbmVyYXRlU3RhdGVtZW50OiB0cnVlLFxucGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbjogdHJ1ZSwgcGFyc2VCbG9jazogdHJ1ZSwgcGFyc2VFeHByZXNzaW9uOiB0cnVlLFxucGFyc2VGdW5jdGlvbkRlY2xhcmF0aW9uOiB0cnVlLCBwYXJzZUZ1bmN0aW9uRXhwcmVzc2lvbjogdHJ1ZSxcbnBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50czogdHJ1ZSwgcGFyc2VWYXJpYWJsZUlkZW50aWZpZXI6IHRydWUsXG5wYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb246IHRydWUsXG5wYXJzZVN0YXRlbWVudDogdHJ1ZSwgcGFyc2VTb3VyY2VFbGVtZW50OiB0cnVlICovXG5cbihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIFVuaXZlcnNhbCBNb2R1bGUgRGVmaW5pdGlvbiAoVU1EKSB0byBzdXBwb3J0IEFNRCwgQ29tbW9uSlMvTm9kZS5qcyxcbiAgICAvLyBSaGlubywgYW5kIHBsYWluIGJyb3dzZXIgbG9hZGluZy5cbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShbJ2V4cG9ydHMnXSwgZmFjdG9yeSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgZmFjdG9yeShleHBvcnRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmYWN0b3J5KChyb290LmVzcHJpbWEgPSB7fSkpO1xuICAgIH1cbn0odGhpcywgZnVuY3Rpb24gKGV4cG9ydHMpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgVG9rZW4sXG4gICAgICAgIFRva2VuTmFtZSxcbiAgICAgICAgU3ludGF4LFxuICAgICAgICBQcm9wZXJ0eUtpbmQsXG4gICAgICAgIE1lc3NhZ2VzLFxuICAgICAgICBSZWdleCxcbiAgICAgICAgc291cmNlLFxuICAgICAgICBzdHJpY3QsXG4gICAgICAgIGluZGV4LFxuICAgICAgICBsaW5lTnVtYmVyLFxuICAgICAgICBsaW5lU3RhcnQsXG4gICAgICAgIGxlbmd0aCxcbiAgICAgICAgYnVmZmVyLFxuICAgICAgICBzdGF0ZSxcbiAgICAgICAgZXh0cmE7XG5cbiAgICBUb2tlbiA9IHtcbiAgICAgICAgQm9vbGVhbkxpdGVyYWw6IDEsXG4gICAgICAgIEVPRjogMixcbiAgICAgICAgSWRlbnRpZmllcjogMyxcbiAgICAgICAgS2V5d29yZDogNCxcbiAgICAgICAgTnVsbExpdGVyYWw6IDUsXG4gICAgICAgIE51bWVyaWNMaXRlcmFsOiA2LFxuICAgICAgICBQdW5jdHVhdG9yOiA3LFxuICAgICAgICBTdHJpbmdMaXRlcmFsOiA4XG4gICAgfTtcblxuICAgIFRva2VuTmFtZSA9IHt9O1xuICAgIFRva2VuTmFtZVtUb2tlbi5Cb29sZWFuTGl0ZXJhbF0gPSAnQm9vbGVhbic7XG4gICAgVG9rZW5OYW1lW1Rva2VuLkVPRl0gPSAnPGVuZD4nO1xuICAgIFRva2VuTmFtZVtUb2tlbi5JZGVudGlmaWVyXSA9ICdJZGVudGlmaWVyJztcbiAgICBUb2tlbk5hbWVbVG9rZW4uS2V5d29yZF0gPSAnS2V5d29yZCc7XG4gICAgVG9rZW5OYW1lW1Rva2VuLk51bGxMaXRlcmFsXSA9ICdOdWxsJztcbiAgICBUb2tlbk5hbWVbVG9rZW4uTnVtZXJpY0xpdGVyYWxdID0gJ051bWVyaWMnO1xuICAgIFRva2VuTmFtZVtUb2tlbi5QdW5jdHVhdG9yXSA9ICdQdW5jdHVhdG9yJztcbiAgICBUb2tlbk5hbWVbVG9rZW4uU3RyaW5nTGl0ZXJhbF0gPSAnU3RyaW5nJztcblxuICAgIFN5bnRheCA9IHtcbiAgICAgICAgQXNzaWdubWVudEV4cHJlc3Npb246ICdBc3NpZ25tZW50RXhwcmVzc2lvbicsXG4gICAgICAgIEFycmF5RXhwcmVzc2lvbjogJ0FycmF5RXhwcmVzc2lvbicsXG4gICAgICAgIEJsb2NrU3RhdGVtZW50OiAnQmxvY2tTdGF0ZW1lbnQnLFxuICAgICAgICBCaW5hcnlFeHByZXNzaW9uOiAnQmluYXJ5RXhwcmVzc2lvbicsXG4gICAgICAgIEJyZWFrU3RhdGVtZW50OiAnQnJlYWtTdGF0ZW1lbnQnLFxuICAgICAgICBDYWxsRXhwcmVzc2lvbjogJ0NhbGxFeHByZXNzaW9uJyxcbiAgICAgICAgQ2F0Y2hDbGF1c2U6ICdDYXRjaENsYXVzZScsXG4gICAgICAgIENvbmRpdGlvbmFsRXhwcmVzc2lvbjogJ0NvbmRpdGlvbmFsRXhwcmVzc2lvbicsXG4gICAgICAgIENvbnRpbnVlU3RhdGVtZW50OiAnQ29udGludWVTdGF0ZW1lbnQnLFxuICAgICAgICBEb1doaWxlU3RhdGVtZW50OiAnRG9XaGlsZVN0YXRlbWVudCcsXG4gICAgICAgIERlYnVnZ2VyU3RhdGVtZW50OiAnRGVidWdnZXJTdGF0ZW1lbnQnLFxuICAgICAgICBFbXB0eVN0YXRlbWVudDogJ0VtcHR5U3RhdGVtZW50JyxcbiAgICAgICAgRXhwcmVzc2lvblN0YXRlbWVudDogJ0V4cHJlc3Npb25TdGF0ZW1lbnQnLFxuICAgICAgICBGb3JTdGF0ZW1lbnQ6ICdGb3JTdGF0ZW1lbnQnLFxuICAgICAgICBGb3JJblN0YXRlbWVudDogJ0ZvckluU3RhdGVtZW50JyxcbiAgICAgICAgRnVuY3Rpb25EZWNsYXJhdGlvbjogJ0Z1bmN0aW9uRGVjbGFyYXRpb24nLFxuICAgICAgICBGdW5jdGlvbkV4cHJlc3Npb246ICdGdW5jdGlvbkV4cHJlc3Npb24nLFxuICAgICAgICBJZGVudGlmaWVyOiAnSWRlbnRpZmllcicsXG4gICAgICAgIElmU3RhdGVtZW50OiAnSWZTdGF0ZW1lbnQnLFxuICAgICAgICBMaXRlcmFsOiAnTGl0ZXJhbCcsXG4gICAgICAgIExhYmVsZWRTdGF0ZW1lbnQ6ICdMYWJlbGVkU3RhdGVtZW50JyxcbiAgICAgICAgTG9naWNhbEV4cHJlc3Npb246ICdMb2dpY2FsRXhwcmVzc2lvbicsXG4gICAgICAgIE1lbWJlckV4cHJlc3Npb246ICdNZW1iZXJFeHByZXNzaW9uJyxcbiAgICAgICAgTmV3RXhwcmVzc2lvbjogJ05ld0V4cHJlc3Npb24nLFxuICAgICAgICBPYmplY3RFeHByZXNzaW9uOiAnT2JqZWN0RXhwcmVzc2lvbicsXG4gICAgICAgIFByb2dyYW06ICdQcm9ncmFtJyxcbiAgICAgICAgUHJvcGVydHk6ICdQcm9wZXJ0eScsXG4gICAgICAgIFJldHVyblN0YXRlbWVudDogJ1JldHVyblN0YXRlbWVudCcsXG4gICAgICAgIFNlcXVlbmNlRXhwcmVzc2lvbjogJ1NlcXVlbmNlRXhwcmVzc2lvbicsXG4gICAgICAgIFN3aXRjaFN0YXRlbWVudDogJ1N3aXRjaFN0YXRlbWVudCcsXG4gICAgICAgIFN3aXRjaENhc2U6ICdTd2l0Y2hDYXNlJyxcbiAgICAgICAgVGhpc0V4cHJlc3Npb246ICdUaGlzRXhwcmVzc2lvbicsXG4gICAgICAgIFRocm93U3RhdGVtZW50OiAnVGhyb3dTdGF0ZW1lbnQnLFxuICAgICAgICBUcnlTdGF0ZW1lbnQ6ICdUcnlTdGF0ZW1lbnQnLFxuICAgICAgICBVbmFyeUV4cHJlc3Npb246ICdVbmFyeUV4cHJlc3Npb24nLFxuICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnVXBkYXRlRXhwcmVzc2lvbicsXG4gICAgICAgIFZhcmlhYmxlRGVjbGFyYXRpb246ICdWYXJpYWJsZURlY2xhcmF0aW9uJyxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdG9yOiAnVmFyaWFibGVEZWNsYXJhdG9yJyxcbiAgICAgICAgV2hpbGVTdGF0ZW1lbnQ6ICdXaGlsZVN0YXRlbWVudCcsXG4gICAgICAgIFdpdGhTdGF0ZW1lbnQ6ICdXaXRoU3RhdGVtZW50J1xuICAgIH07XG5cbiAgICBQcm9wZXJ0eUtpbmQgPSB7XG4gICAgICAgIERhdGE6IDEsXG4gICAgICAgIEdldDogMixcbiAgICAgICAgU2V0OiA0XG4gICAgfTtcblxuICAgIC8vIEVycm9yIG1lc3NhZ2VzIHNob3VsZCBiZSBpZGVudGljYWwgdG8gVjguXG4gICAgTWVzc2FnZXMgPSB7XG4gICAgICAgIFVuZXhwZWN0ZWRUb2tlbjogICdVbmV4cGVjdGVkIHRva2VuICUwJyxcbiAgICAgICAgVW5leHBlY3RlZE51bWJlcjogICdVbmV4cGVjdGVkIG51bWJlcicsXG4gICAgICAgIFVuZXhwZWN0ZWRTdHJpbmc6ICAnVW5leHBlY3RlZCBzdHJpbmcnLFxuICAgICAgICBVbmV4cGVjdGVkSWRlbnRpZmllcjogICdVbmV4cGVjdGVkIGlkZW50aWZpZXInLFxuICAgICAgICBVbmV4cGVjdGVkUmVzZXJ2ZWQ6ICAnVW5leHBlY3RlZCByZXNlcnZlZCB3b3JkJyxcbiAgICAgICAgVW5leHBlY3RlZEVPUzogICdVbmV4cGVjdGVkIGVuZCBvZiBpbnB1dCcsXG4gICAgICAgIE5ld2xpbmVBZnRlclRocm93OiAgJ0lsbGVnYWwgbmV3bGluZSBhZnRlciB0aHJvdycsXG4gICAgICAgIEludmFsaWRSZWdFeHA6ICdJbnZhbGlkIHJlZ3VsYXIgZXhwcmVzc2lvbicsXG4gICAgICAgIFVudGVybWluYXRlZFJlZ0V4cDogICdJbnZhbGlkIHJlZ3VsYXIgZXhwcmVzc2lvbjogbWlzc2luZyAvJyxcbiAgICAgICAgSW52YWxpZExIU0luQXNzaWdubWVudDogICdJbnZhbGlkIGxlZnQtaGFuZCBzaWRlIGluIGFzc2lnbm1lbnQnLFxuICAgICAgICBJbnZhbGlkTEhTSW5Gb3JJbjogICdJbnZhbGlkIGxlZnQtaGFuZCBzaWRlIGluIGZvci1pbicsXG4gICAgICAgIE11bHRpcGxlRGVmYXVsdHNJblN3aXRjaDogJ01vcmUgdGhhbiBvbmUgZGVmYXVsdCBjbGF1c2UgaW4gc3dpdGNoIHN0YXRlbWVudCcsXG4gICAgICAgIE5vQ2F0Y2hPckZpbmFsbHk6ICAnTWlzc2luZyBjYXRjaCBvciBmaW5hbGx5IGFmdGVyIHRyeScsXG4gICAgICAgIFVua25vd25MYWJlbDogJ1VuZGVmaW5lZCBsYWJlbCBcXCclMFxcJycsXG4gICAgICAgIFJlZGVjbGFyYXRpb246ICclMCBcXCclMVxcJyBoYXMgYWxyZWFkeSBiZWVuIGRlY2xhcmVkJyxcbiAgICAgICAgSWxsZWdhbENvbnRpbnVlOiAnSWxsZWdhbCBjb250aW51ZSBzdGF0ZW1lbnQnLFxuICAgICAgICBJbGxlZ2FsQnJlYWs6ICdJbGxlZ2FsIGJyZWFrIHN0YXRlbWVudCcsXG4gICAgICAgIElsbGVnYWxSZXR1cm46ICdJbGxlZ2FsIHJldHVybiBzdGF0ZW1lbnQnLFxuICAgICAgICBTdHJpY3RNb2RlV2l0aDogICdTdHJpY3QgbW9kZSBjb2RlIG1heSBub3QgaW5jbHVkZSBhIHdpdGggc3RhdGVtZW50JyxcbiAgICAgICAgU3RyaWN0Q2F0Y2hWYXJpYWJsZTogICdDYXRjaCB2YXJpYWJsZSBtYXkgbm90IGJlIGV2YWwgb3IgYXJndW1lbnRzIGluIHN0cmljdCBtb2RlJyxcbiAgICAgICAgU3RyaWN0VmFyTmFtZTogICdWYXJpYWJsZSBuYW1lIG1heSBub3QgYmUgZXZhbCBvciBhcmd1bWVudHMgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RQYXJhbU5hbWU6ICAnUGFyYW1ldGVyIG5hbWUgZXZhbCBvciBhcmd1bWVudHMgaXMgbm90IGFsbG93ZWQgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RQYXJhbUR1cGU6ICdTdHJpY3QgbW9kZSBmdW5jdGlvbiBtYXkgbm90IGhhdmUgZHVwbGljYXRlIHBhcmFtZXRlciBuYW1lcycsXG4gICAgICAgIFN0cmljdEZ1bmN0aW9uTmFtZTogICdGdW5jdGlvbiBuYW1lIG1heSBub3QgYmUgZXZhbCBvciBhcmd1bWVudHMgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RPY3RhbExpdGVyYWw6ICAnT2N0YWwgbGl0ZXJhbHMgYXJlIG5vdCBhbGxvd2VkIGluIHN0cmljdCBtb2RlLicsXG4gICAgICAgIFN0cmljdERlbGV0ZTogICdEZWxldGUgb2YgYW4gdW5xdWFsaWZpZWQgaWRlbnRpZmllciBpbiBzdHJpY3QgbW9kZS4nLFxuICAgICAgICBTdHJpY3REdXBsaWNhdGVQcm9wZXJ0eTogICdEdXBsaWNhdGUgZGF0YSBwcm9wZXJ0eSBpbiBvYmplY3QgbGl0ZXJhbCBub3QgYWxsb3dlZCBpbiBzdHJpY3QgbW9kZScsXG4gICAgICAgIEFjY2Vzc29yRGF0YVByb3BlcnR5OiAgJ09iamVjdCBsaXRlcmFsIG1heSBub3QgaGF2ZSBkYXRhIGFuZCBhY2Nlc3NvciBwcm9wZXJ0eSB3aXRoIHRoZSBzYW1lIG5hbWUnLFxuICAgICAgICBBY2Nlc3NvckdldFNldDogICdPYmplY3QgbGl0ZXJhbCBtYXkgbm90IGhhdmUgbXVsdGlwbGUgZ2V0L3NldCBhY2Nlc3NvcnMgd2l0aCB0aGUgc2FtZSBuYW1lJyxcbiAgICAgICAgU3RyaWN0TEhTQXNzaWdubWVudDogICdBc3NpZ25tZW50IHRvIGV2YWwgb3IgYXJndW1lbnRzIGlzIG5vdCBhbGxvd2VkIGluIHN0cmljdCBtb2RlJyxcbiAgICAgICAgU3RyaWN0TEhTUG9zdGZpeDogICdQb3N0Zml4IGluY3JlbWVudC9kZWNyZW1lbnQgbWF5IG5vdCBoYXZlIGV2YWwgb3IgYXJndW1lbnRzIG9wZXJhbmQgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RMSFNQcmVmaXg6ICAnUHJlZml4IGluY3JlbWVudC9kZWNyZW1lbnQgbWF5IG5vdCBoYXZlIGV2YWwgb3IgYXJndW1lbnRzIG9wZXJhbmQgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RSZXNlcnZlZFdvcmQ6ICAnVXNlIG9mIGZ1dHVyZSByZXNlcnZlZCB3b3JkIGluIHN0cmljdCBtb2RlJ1xuICAgIH07XG5cbiAgICAvLyBTZWUgYWxzbyB0b29scy9nZW5lcmF0ZS11bmljb2RlLXJlZ2V4LnB5LlxuICAgIFJlZ2V4ID0ge1xuICAgICAgICBOb25Bc2NpaUlkZW50aWZpZXJTdGFydDogbmV3IFJlZ0V4cCgnW1xceGFhXFx4YjVcXHhiYVxceGMwLVxceGQ2XFx4ZDgtXFx4ZjZcXHhmOC1cXHUwMmMxXFx1MDJjNi1cXHUwMmQxXFx1MDJlMC1cXHUwMmU0XFx1MDJlY1xcdTAyZWVcXHUwMzcwLVxcdTAzNzRcXHUwMzc2XFx1MDM3N1xcdTAzN2EtXFx1MDM3ZFxcdTAzODZcXHUwMzg4LVxcdTAzOGFcXHUwMzhjXFx1MDM4ZS1cXHUwM2ExXFx1MDNhMy1cXHUwM2Y1XFx1MDNmNy1cXHUwNDgxXFx1MDQ4YS1cXHUwNTI3XFx1MDUzMS1cXHUwNTU2XFx1MDU1OVxcdTA1NjEtXFx1MDU4N1xcdTA1ZDAtXFx1MDVlYVxcdTA1ZjAtXFx1MDVmMlxcdTA2MjAtXFx1MDY0YVxcdTA2NmVcXHUwNjZmXFx1MDY3MS1cXHUwNmQzXFx1MDZkNVxcdTA2ZTVcXHUwNmU2XFx1MDZlZVxcdTA2ZWZcXHUwNmZhLVxcdTA2ZmNcXHUwNmZmXFx1MDcxMFxcdTA3MTItXFx1MDcyZlxcdTA3NGQtXFx1MDdhNVxcdTA3YjFcXHUwN2NhLVxcdTA3ZWFcXHUwN2Y0XFx1MDdmNVxcdTA3ZmFcXHUwODAwLVxcdTA4MTVcXHUwODFhXFx1MDgyNFxcdTA4MjhcXHUwODQwLVxcdTA4NThcXHUwOGEwXFx1MDhhMi1cXHUwOGFjXFx1MDkwNC1cXHUwOTM5XFx1MDkzZFxcdTA5NTBcXHUwOTU4LVxcdTA5NjFcXHUwOTcxLVxcdTA5NzdcXHUwOTc5LVxcdTA5N2ZcXHUwOTg1LVxcdTA5OGNcXHUwOThmXFx1MDk5MFxcdTA5OTMtXFx1MDlhOFxcdTA5YWEtXFx1MDliMFxcdTA5YjJcXHUwOWI2LVxcdTA5YjlcXHUwOWJkXFx1MDljZVxcdTA5ZGNcXHUwOWRkXFx1MDlkZi1cXHUwOWUxXFx1MDlmMFxcdTA5ZjFcXHUwYTA1LVxcdTBhMGFcXHUwYTBmXFx1MGExMFxcdTBhMTMtXFx1MGEyOFxcdTBhMmEtXFx1MGEzMFxcdTBhMzJcXHUwYTMzXFx1MGEzNVxcdTBhMzZcXHUwYTM4XFx1MGEzOVxcdTBhNTktXFx1MGE1Y1xcdTBhNWVcXHUwYTcyLVxcdTBhNzRcXHUwYTg1LVxcdTBhOGRcXHUwYThmLVxcdTBhOTFcXHUwYTkzLVxcdTBhYThcXHUwYWFhLVxcdTBhYjBcXHUwYWIyXFx1MGFiM1xcdTBhYjUtXFx1MGFiOVxcdTBhYmRcXHUwYWQwXFx1MGFlMFxcdTBhZTFcXHUwYjA1LVxcdTBiMGNcXHUwYjBmXFx1MGIxMFxcdTBiMTMtXFx1MGIyOFxcdTBiMmEtXFx1MGIzMFxcdTBiMzJcXHUwYjMzXFx1MGIzNS1cXHUwYjM5XFx1MGIzZFxcdTBiNWNcXHUwYjVkXFx1MGI1Zi1cXHUwYjYxXFx1MGI3MVxcdTBiODNcXHUwYjg1LVxcdTBiOGFcXHUwYjhlLVxcdTBiOTBcXHUwYjkyLVxcdTBiOTVcXHUwYjk5XFx1MGI5YVxcdTBiOWNcXHUwYjllXFx1MGI5ZlxcdTBiYTNcXHUwYmE0XFx1MGJhOC1cXHUwYmFhXFx1MGJhZS1cXHUwYmI5XFx1MGJkMFxcdTBjMDUtXFx1MGMwY1xcdTBjMGUtXFx1MGMxMFxcdTBjMTItXFx1MGMyOFxcdTBjMmEtXFx1MGMzM1xcdTBjMzUtXFx1MGMzOVxcdTBjM2RcXHUwYzU4XFx1MGM1OVxcdTBjNjBcXHUwYzYxXFx1MGM4NS1cXHUwYzhjXFx1MGM4ZS1cXHUwYzkwXFx1MGM5Mi1cXHUwY2E4XFx1MGNhYS1cXHUwY2IzXFx1MGNiNS1cXHUwY2I5XFx1MGNiZFxcdTBjZGVcXHUwY2UwXFx1MGNlMVxcdTBjZjFcXHUwY2YyXFx1MGQwNS1cXHUwZDBjXFx1MGQwZS1cXHUwZDEwXFx1MGQxMi1cXHUwZDNhXFx1MGQzZFxcdTBkNGVcXHUwZDYwXFx1MGQ2MVxcdTBkN2EtXFx1MGQ3ZlxcdTBkODUtXFx1MGQ5NlxcdTBkOWEtXFx1MGRiMVxcdTBkYjMtXFx1MGRiYlxcdTBkYmRcXHUwZGMwLVxcdTBkYzZcXHUwZTAxLVxcdTBlMzBcXHUwZTMyXFx1MGUzM1xcdTBlNDAtXFx1MGU0NlxcdTBlODFcXHUwZTgyXFx1MGU4NFxcdTBlODdcXHUwZTg4XFx1MGU4YVxcdTBlOGRcXHUwZTk0LVxcdTBlOTdcXHUwZTk5LVxcdTBlOWZcXHUwZWExLVxcdTBlYTNcXHUwZWE1XFx1MGVhN1xcdTBlYWFcXHUwZWFiXFx1MGVhZC1cXHUwZWIwXFx1MGViMlxcdTBlYjNcXHUwZWJkXFx1MGVjMC1cXHUwZWM0XFx1MGVjNlxcdTBlZGMtXFx1MGVkZlxcdTBmMDBcXHUwZjQwLVxcdTBmNDdcXHUwZjQ5LVxcdTBmNmNcXHUwZjg4LVxcdTBmOGNcXHUxMDAwLVxcdTEwMmFcXHUxMDNmXFx1MTA1MC1cXHUxMDU1XFx1MTA1YS1cXHUxMDVkXFx1MTA2MVxcdTEwNjVcXHUxMDY2XFx1MTA2ZS1cXHUxMDcwXFx1MTA3NS1cXHUxMDgxXFx1MTA4ZVxcdTEwYTAtXFx1MTBjNVxcdTEwYzdcXHUxMGNkXFx1MTBkMC1cXHUxMGZhXFx1MTBmYy1cXHUxMjQ4XFx1MTI0YS1cXHUxMjRkXFx1MTI1MC1cXHUxMjU2XFx1MTI1OFxcdTEyNWEtXFx1MTI1ZFxcdTEyNjAtXFx1MTI4OFxcdTEyOGEtXFx1MTI4ZFxcdTEyOTAtXFx1MTJiMFxcdTEyYjItXFx1MTJiNVxcdTEyYjgtXFx1MTJiZVxcdTEyYzBcXHUxMmMyLVxcdTEyYzVcXHUxMmM4LVxcdTEyZDZcXHUxMmQ4LVxcdTEzMTBcXHUxMzEyLVxcdTEzMTVcXHUxMzE4LVxcdTEzNWFcXHUxMzgwLVxcdTEzOGZcXHUxM2EwLVxcdTEzZjRcXHUxNDAxLVxcdTE2NmNcXHUxNjZmLVxcdTE2N2ZcXHUxNjgxLVxcdTE2OWFcXHUxNmEwLVxcdTE2ZWFcXHUxNmVlLVxcdTE2ZjBcXHUxNzAwLVxcdTE3MGNcXHUxNzBlLVxcdTE3MTFcXHUxNzIwLVxcdTE3MzFcXHUxNzQwLVxcdTE3NTFcXHUxNzYwLVxcdTE3NmNcXHUxNzZlLVxcdTE3NzBcXHUxNzgwLVxcdTE3YjNcXHUxN2Q3XFx1MTdkY1xcdTE4MjAtXFx1MTg3N1xcdTE4ODAtXFx1MThhOFxcdTE4YWFcXHUxOGIwLVxcdTE4ZjVcXHUxOTAwLVxcdTE5MWNcXHUxOTUwLVxcdTE5NmRcXHUxOTcwLVxcdTE5NzRcXHUxOTgwLVxcdTE5YWJcXHUxOWMxLVxcdTE5YzdcXHUxYTAwLVxcdTFhMTZcXHUxYTIwLVxcdTFhNTRcXHUxYWE3XFx1MWIwNS1cXHUxYjMzXFx1MWI0NS1cXHUxYjRiXFx1MWI4My1cXHUxYmEwXFx1MWJhZVxcdTFiYWZcXHUxYmJhLVxcdTFiZTVcXHUxYzAwLVxcdTFjMjNcXHUxYzRkLVxcdTFjNGZcXHUxYzVhLVxcdTFjN2RcXHUxY2U5LVxcdTFjZWNcXHUxY2VlLVxcdTFjZjFcXHUxY2Y1XFx1MWNmNlxcdTFkMDAtXFx1MWRiZlxcdTFlMDAtXFx1MWYxNVxcdTFmMTgtXFx1MWYxZFxcdTFmMjAtXFx1MWY0NVxcdTFmNDgtXFx1MWY0ZFxcdTFmNTAtXFx1MWY1N1xcdTFmNTlcXHUxZjViXFx1MWY1ZFxcdTFmNWYtXFx1MWY3ZFxcdTFmODAtXFx1MWZiNFxcdTFmYjYtXFx1MWZiY1xcdTFmYmVcXHUxZmMyLVxcdTFmYzRcXHUxZmM2LVxcdTFmY2NcXHUxZmQwLVxcdTFmZDNcXHUxZmQ2LVxcdTFmZGJcXHUxZmUwLVxcdTFmZWNcXHUxZmYyLVxcdTFmZjRcXHUxZmY2LVxcdTFmZmNcXHUyMDcxXFx1MjA3ZlxcdTIwOTAtXFx1MjA5Y1xcdTIxMDJcXHUyMTA3XFx1MjEwYS1cXHUyMTEzXFx1MjExNVxcdTIxMTktXFx1MjExZFxcdTIxMjRcXHUyMTI2XFx1MjEyOFxcdTIxMmEtXFx1MjEyZFxcdTIxMmYtXFx1MjEzOVxcdTIxM2MtXFx1MjEzZlxcdTIxNDUtXFx1MjE0OVxcdTIxNGVcXHUyMTYwLVxcdTIxODhcXHUyYzAwLVxcdTJjMmVcXHUyYzMwLVxcdTJjNWVcXHUyYzYwLVxcdTJjZTRcXHUyY2ViLVxcdTJjZWVcXHUyY2YyXFx1MmNmM1xcdTJkMDAtXFx1MmQyNVxcdTJkMjdcXHUyZDJkXFx1MmQzMC1cXHUyZDY3XFx1MmQ2ZlxcdTJkODAtXFx1MmQ5NlxcdTJkYTAtXFx1MmRhNlxcdTJkYTgtXFx1MmRhZVxcdTJkYjAtXFx1MmRiNlxcdTJkYjgtXFx1MmRiZVxcdTJkYzAtXFx1MmRjNlxcdTJkYzgtXFx1MmRjZVxcdTJkZDAtXFx1MmRkNlxcdTJkZDgtXFx1MmRkZVxcdTJlMmZcXHUzMDA1LVxcdTMwMDdcXHUzMDIxLVxcdTMwMjlcXHUzMDMxLVxcdTMwMzVcXHUzMDM4LVxcdTMwM2NcXHUzMDQxLVxcdTMwOTZcXHUzMDlkLVxcdTMwOWZcXHUzMGExLVxcdTMwZmFcXHUzMGZjLVxcdTMwZmZcXHUzMTA1LVxcdTMxMmRcXHUzMTMxLVxcdTMxOGVcXHUzMWEwLVxcdTMxYmFcXHUzMWYwLVxcdTMxZmZcXHUzNDAwLVxcdTRkYjVcXHU0ZTAwLVxcdTlmY2NcXHVhMDAwLVxcdWE0OGNcXHVhNGQwLVxcdWE0ZmRcXHVhNTAwLVxcdWE2MGNcXHVhNjEwLVxcdWE2MWZcXHVhNjJhXFx1YTYyYlxcdWE2NDAtXFx1YTY2ZVxcdWE2N2YtXFx1YTY5N1xcdWE2YTAtXFx1YTZlZlxcdWE3MTctXFx1YTcxZlxcdWE3MjItXFx1YTc4OFxcdWE3OGItXFx1YTc4ZVxcdWE3OTAtXFx1YTc5M1xcdWE3YTAtXFx1YTdhYVxcdWE3ZjgtXFx1YTgwMVxcdWE4MDMtXFx1YTgwNVxcdWE4MDctXFx1YTgwYVxcdWE4MGMtXFx1YTgyMlxcdWE4NDAtXFx1YTg3M1xcdWE4ODItXFx1YThiM1xcdWE4ZjItXFx1YThmN1xcdWE4ZmJcXHVhOTBhLVxcdWE5MjVcXHVhOTMwLVxcdWE5NDZcXHVhOTYwLVxcdWE5N2NcXHVhOTg0LVxcdWE5YjJcXHVhOWNmXFx1YWEwMC1cXHVhYTI4XFx1YWE0MC1cXHVhYTQyXFx1YWE0NC1cXHVhYTRiXFx1YWE2MC1cXHVhYTc2XFx1YWE3YVxcdWFhODAtXFx1YWFhZlxcdWFhYjFcXHVhYWI1XFx1YWFiNlxcdWFhYjktXFx1YWFiZFxcdWFhYzBcXHVhYWMyXFx1YWFkYi1cXHVhYWRkXFx1YWFlMC1cXHVhYWVhXFx1YWFmMi1cXHVhYWY0XFx1YWIwMS1cXHVhYjA2XFx1YWIwOS1cXHVhYjBlXFx1YWIxMS1cXHVhYjE2XFx1YWIyMC1cXHVhYjI2XFx1YWIyOC1cXHVhYjJlXFx1YWJjMC1cXHVhYmUyXFx1YWMwMC1cXHVkN2EzXFx1ZDdiMC1cXHVkN2M2XFx1ZDdjYi1cXHVkN2ZiXFx1ZjkwMC1cXHVmYTZkXFx1ZmE3MC1cXHVmYWQ5XFx1ZmIwMC1cXHVmYjA2XFx1ZmIxMy1cXHVmYjE3XFx1ZmIxZFxcdWZiMWYtXFx1ZmIyOFxcdWZiMmEtXFx1ZmIzNlxcdWZiMzgtXFx1ZmIzY1xcdWZiM2VcXHVmYjQwXFx1ZmI0MVxcdWZiNDNcXHVmYjQ0XFx1ZmI0Ni1cXHVmYmIxXFx1ZmJkMy1cXHVmZDNkXFx1ZmQ1MC1cXHVmZDhmXFx1ZmQ5Mi1cXHVmZGM3XFx1ZmRmMC1cXHVmZGZiXFx1ZmU3MC1cXHVmZTc0XFx1ZmU3Ni1cXHVmZWZjXFx1ZmYyMS1cXHVmZjNhXFx1ZmY0MS1cXHVmZjVhXFx1ZmY2Ni1cXHVmZmJlXFx1ZmZjMi1cXHVmZmM3XFx1ZmZjYS1cXHVmZmNmXFx1ZmZkMi1cXHVmZmQ3XFx1ZmZkYS1cXHVmZmRjXScpLFxuICAgICAgICBOb25Bc2NpaUlkZW50aWZpZXJQYXJ0OiBuZXcgUmVnRXhwKCdbXFx4YWFcXHhiNVxceGJhXFx4YzAtXFx4ZDZcXHhkOC1cXHhmNlxceGY4LVxcdTAyYzFcXHUwMmM2LVxcdTAyZDFcXHUwMmUwLVxcdTAyZTRcXHUwMmVjXFx1MDJlZVxcdTAzMDAtXFx1MDM3NFxcdTAzNzZcXHUwMzc3XFx1MDM3YS1cXHUwMzdkXFx1MDM4NlxcdTAzODgtXFx1MDM4YVxcdTAzOGNcXHUwMzhlLVxcdTAzYTFcXHUwM2EzLVxcdTAzZjVcXHUwM2Y3LVxcdTA0ODFcXHUwNDgzLVxcdTA0ODdcXHUwNDhhLVxcdTA1MjdcXHUwNTMxLVxcdTA1NTZcXHUwNTU5XFx1MDU2MS1cXHUwNTg3XFx1MDU5MS1cXHUwNWJkXFx1MDViZlxcdTA1YzFcXHUwNWMyXFx1MDVjNFxcdTA1YzVcXHUwNWM3XFx1MDVkMC1cXHUwNWVhXFx1MDVmMC1cXHUwNWYyXFx1MDYxMC1cXHUwNjFhXFx1MDYyMC1cXHUwNjY5XFx1MDY2ZS1cXHUwNmQzXFx1MDZkNS1cXHUwNmRjXFx1MDZkZi1cXHUwNmU4XFx1MDZlYS1cXHUwNmZjXFx1MDZmZlxcdTA3MTAtXFx1MDc0YVxcdTA3NGQtXFx1MDdiMVxcdTA3YzAtXFx1MDdmNVxcdTA3ZmFcXHUwODAwLVxcdTA4MmRcXHUwODQwLVxcdTA4NWJcXHUwOGEwXFx1MDhhMi1cXHUwOGFjXFx1MDhlNC1cXHUwOGZlXFx1MDkwMC1cXHUwOTYzXFx1MDk2Ni1cXHUwOTZmXFx1MDk3MS1cXHUwOTc3XFx1MDk3OS1cXHUwOTdmXFx1MDk4MS1cXHUwOTgzXFx1MDk4NS1cXHUwOThjXFx1MDk4ZlxcdTA5OTBcXHUwOTkzLVxcdTA5YThcXHUwOWFhLVxcdTA5YjBcXHUwOWIyXFx1MDliNi1cXHUwOWI5XFx1MDliYy1cXHUwOWM0XFx1MDljN1xcdTA5YzhcXHUwOWNiLVxcdTA5Y2VcXHUwOWQ3XFx1MDlkY1xcdTA5ZGRcXHUwOWRmLVxcdTA5ZTNcXHUwOWU2LVxcdTA5ZjFcXHUwYTAxLVxcdTBhMDNcXHUwYTA1LVxcdTBhMGFcXHUwYTBmXFx1MGExMFxcdTBhMTMtXFx1MGEyOFxcdTBhMmEtXFx1MGEzMFxcdTBhMzJcXHUwYTMzXFx1MGEzNVxcdTBhMzZcXHUwYTM4XFx1MGEzOVxcdTBhM2NcXHUwYTNlLVxcdTBhNDJcXHUwYTQ3XFx1MGE0OFxcdTBhNGItXFx1MGE0ZFxcdTBhNTFcXHUwYTU5LVxcdTBhNWNcXHUwYTVlXFx1MGE2Ni1cXHUwYTc1XFx1MGE4MS1cXHUwYTgzXFx1MGE4NS1cXHUwYThkXFx1MGE4Zi1cXHUwYTkxXFx1MGE5My1cXHUwYWE4XFx1MGFhYS1cXHUwYWIwXFx1MGFiMlxcdTBhYjNcXHUwYWI1LVxcdTBhYjlcXHUwYWJjLVxcdTBhYzVcXHUwYWM3LVxcdTBhYzlcXHUwYWNiLVxcdTBhY2RcXHUwYWQwXFx1MGFlMC1cXHUwYWUzXFx1MGFlNi1cXHUwYWVmXFx1MGIwMS1cXHUwYjAzXFx1MGIwNS1cXHUwYjBjXFx1MGIwZlxcdTBiMTBcXHUwYjEzLVxcdTBiMjhcXHUwYjJhLVxcdTBiMzBcXHUwYjMyXFx1MGIzM1xcdTBiMzUtXFx1MGIzOVxcdTBiM2MtXFx1MGI0NFxcdTBiNDdcXHUwYjQ4XFx1MGI0Yi1cXHUwYjRkXFx1MGI1NlxcdTBiNTdcXHUwYjVjXFx1MGI1ZFxcdTBiNWYtXFx1MGI2M1xcdTBiNjYtXFx1MGI2ZlxcdTBiNzFcXHUwYjgyXFx1MGI4M1xcdTBiODUtXFx1MGI4YVxcdTBiOGUtXFx1MGI5MFxcdTBiOTItXFx1MGI5NVxcdTBiOTlcXHUwYjlhXFx1MGI5Y1xcdTBiOWVcXHUwYjlmXFx1MGJhM1xcdTBiYTRcXHUwYmE4LVxcdTBiYWFcXHUwYmFlLVxcdTBiYjlcXHUwYmJlLVxcdTBiYzJcXHUwYmM2LVxcdTBiYzhcXHUwYmNhLVxcdTBiY2RcXHUwYmQwXFx1MGJkN1xcdTBiZTYtXFx1MGJlZlxcdTBjMDEtXFx1MGMwM1xcdTBjMDUtXFx1MGMwY1xcdTBjMGUtXFx1MGMxMFxcdTBjMTItXFx1MGMyOFxcdTBjMmEtXFx1MGMzM1xcdTBjMzUtXFx1MGMzOVxcdTBjM2QtXFx1MGM0NFxcdTBjNDYtXFx1MGM0OFxcdTBjNGEtXFx1MGM0ZFxcdTBjNTVcXHUwYzU2XFx1MGM1OFxcdTBjNTlcXHUwYzYwLVxcdTBjNjNcXHUwYzY2LVxcdTBjNmZcXHUwYzgyXFx1MGM4M1xcdTBjODUtXFx1MGM4Y1xcdTBjOGUtXFx1MGM5MFxcdTBjOTItXFx1MGNhOFxcdTBjYWEtXFx1MGNiM1xcdTBjYjUtXFx1MGNiOVxcdTBjYmMtXFx1MGNjNFxcdTBjYzYtXFx1MGNjOFxcdTBjY2EtXFx1MGNjZFxcdTBjZDVcXHUwY2Q2XFx1MGNkZVxcdTBjZTAtXFx1MGNlM1xcdTBjZTYtXFx1MGNlZlxcdTBjZjFcXHUwY2YyXFx1MGQwMlxcdTBkMDNcXHUwZDA1LVxcdTBkMGNcXHUwZDBlLVxcdTBkMTBcXHUwZDEyLVxcdTBkM2FcXHUwZDNkLVxcdTBkNDRcXHUwZDQ2LVxcdTBkNDhcXHUwZDRhLVxcdTBkNGVcXHUwZDU3XFx1MGQ2MC1cXHUwZDYzXFx1MGQ2Ni1cXHUwZDZmXFx1MGQ3YS1cXHUwZDdmXFx1MGQ4MlxcdTBkODNcXHUwZDg1LVxcdTBkOTZcXHUwZDlhLVxcdTBkYjFcXHUwZGIzLVxcdTBkYmJcXHUwZGJkXFx1MGRjMC1cXHUwZGM2XFx1MGRjYVxcdTBkY2YtXFx1MGRkNFxcdTBkZDZcXHUwZGQ4LVxcdTBkZGZcXHUwZGYyXFx1MGRmM1xcdTBlMDEtXFx1MGUzYVxcdTBlNDAtXFx1MGU0ZVxcdTBlNTAtXFx1MGU1OVxcdTBlODFcXHUwZTgyXFx1MGU4NFxcdTBlODdcXHUwZTg4XFx1MGU4YVxcdTBlOGRcXHUwZTk0LVxcdTBlOTdcXHUwZTk5LVxcdTBlOWZcXHUwZWExLVxcdTBlYTNcXHUwZWE1XFx1MGVhN1xcdTBlYWFcXHUwZWFiXFx1MGVhZC1cXHUwZWI5XFx1MGViYi1cXHUwZWJkXFx1MGVjMC1cXHUwZWM0XFx1MGVjNlxcdTBlYzgtXFx1MGVjZFxcdTBlZDAtXFx1MGVkOVxcdTBlZGMtXFx1MGVkZlxcdTBmMDBcXHUwZjE4XFx1MGYxOVxcdTBmMjAtXFx1MGYyOVxcdTBmMzVcXHUwZjM3XFx1MGYzOVxcdTBmM2UtXFx1MGY0N1xcdTBmNDktXFx1MGY2Y1xcdTBmNzEtXFx1MGY4NFxcdTBmODYtXFx1MGY5N1xcdTBmOTktXFx1MGZiY1xcdTBmYzZcXHUxMDAwLVxcdTEwNDlcXHUxMDUwLVxcdTEwOWRcXHUxMGEwLVxcdTEwYzVcXHUxMGM3XFx1MTBjZFxcdTEwZDAtXFx1MTBmYVxcdTEwZmMtXFx1MTI0OFxcdTEyNGEtXFx1MTI0ZFxcdTEyNTAtXFx1MTI1NlxcdTEyNThcXHUxMjVhLVxcdTEyNWRcXHUxMjYwLVxcdTEyODhcXHUxMjhhLVxcdTEyOGRcXHUxMjkwLVxcdTEyYjBcXHUxMmIyLVxcdTEyYjVcXHUxMmI4LVxcdTEyYmVcXHUxMmMwXFx1MTJjMi1cXHUxMmM1XFx1MTJjOC1cXHUxMmQ2XFx1MTJkOC1cXHUxMzEwXFx1MTMxMi1cXHUxMzE1XFx1MTMxOC1cXHUxMzVhXFx1MTM1ZC1cXHUxMzVmXFx1MTM4MC1cXHUxMzhmXFx1MTNhMC1cXHUxM2Y0XFx1MTQwMS1cXHUxNjZjXFx1MTY2Zi1cXHUxNjdmXFx1MTY4MS1cXHUxNjlhXFx1MTZhMC1cXHUxNmVhXFx1MTZlZS1cXHUxNmYwXFx1MTcwMC1cXHUxNzBjXFx1MTcwZS1cXHUxNzE0XFx1MTcyMC1cXHUxNzM0XFx1MTc0MC1cXHUxNzUzXFx1MTc2MC1cXHUxNzZjXFx1MTc2ZS1cXHUxNzcwXFx1MTc3MlxcdTE3NzNcXHUxNzgwLVxcdTE3ZDNcXHUxN2Q3XFx1MTdkY1xcdTE3ZGRcXHUxN2UwLVxcdTE3ZTlcXHUxODBiLVxcdTE4MGRcXHUxODEwLVxcdTE4MTlcXHUxODIwLVxcdTE4NzdcXHUxODgwLVxcdTE4YWFcXHUxOGIwLVxcdTE4ZjVcXHUxOTAwLVxcdTE5MWNcXHUxOTIwLVxcdTE5MmJcXHUxOTMwLVxcdTE5M2JcXHUxOTQ2LVxcdTE5NmRcXHUxOTcwLVxcdTE5NzRcXHUxOTgwLVxcdTE5YWJcXHUxOWIwLVxcdTE5YzlcXHUxOWQwLVxcdTE5ZDlcXHUxYTAwLVxcdTFhMWJcXHUxYTIwLVxcdTFhNWVcXHUxYTYwLVxcdTFhN2NcXHUxYTdmLVxcdTFhODlcXHUxYTkwLVxcdTFhOTlcXHUxYWE3XFx1MWIwMC1cXHUxYjRiXFx1MWI1MC1cXHUxYjU5XFx1MWI2Yi1cXHUxYjczXFx1MWI4MC1cXHUxYmYzXFx1MWMwMC1cXHUxYzM3XFx1MWM0MC1cXHUxYzQ5XFx1MWM0ZC1cXHUxYzdkXFx1MWNkMC1cXHUxY2QyXFx1MWNkNC1cXHUxY2Y2XFx1MWQwMC1cXHUxZGU2XFx1MWRmYy1cXHUxZjE1XFx1MWYxOC1cXHUxZjFkXFx1MWYyMC1cXHUxZjQ1XFx1MWY0OC1cXHUxZjRkXFx1MWY1MC1cXHUxZjU3XFx1MWY1OVxcdTFmNWJcXHUxZjVkXFx1MWY1Zi1cXHUxZjdkXFx1MWY4MC1cXHUxZmI0XFx1MWZiNi1cXHUxZmJjXFx1MWZiZVxcdTFmYzItXFx1MWZjNFxcdTFmYzYtXFx1MWZjY1xcdTFmZDAtXFx1MWZkM1xcdTFmZDYtXFx1MWZkYlxcdTFmZTAtXFx1MWZlY1xcdTFmZjItXFx1MWZmNFxcdTFmZjYtXFx1MWZmY1xcdTIwMGNcXHUyMDBkXFx1MjAzZlxcdTIwNDBcXHUyMDU0XFx1MjA3MVxcdTIwN2ZcXHUyMDkwLVxcdTIwOWNcXHUyMGQwLVxcdTIwZGNcXHUyMGUxXFx1MjBlNS1cXHUyMGYwXFx1MjEwMlxcdTIxMDdcXHUyMTBhLVxcdTIxMTNcXHUyMTE1XFx1MjExOS1cXHUyMTFkXFx1MjEyNFxcdTIxMjZcXHUyMTI4XFx1MjEyYS1cXHUyMTJkXFx1MjEyZi1cXHUyMTM5XFx1MjEzYy1cXHUyMTNmXFx1MjE0NS1cXHUyMTQ5XFx1MjE0ZVxcdTIxNjAtXFx1MjE4OFxcdTJjMDAtXFx1MmMyZVxcdTJjMzAtXFx1MmM1ZVxcdTJjNjAtXFx1MmNlNFxcdTJjZWItXFx1MmNmM1xcdTJkMDAtXFx1MmQyNVxcdTJkMjdcXHUyZDJkXFx1MmQzMC1cXHUyZDY3XFx1MmQ2ZlxcdTJkN2YtXFx1MmQ5NlxcdTJkYTAtXFx1MmRhNlxcdTJkYTgtXFx1MmRhZVxcdTJkYjAtXFx1MmRiNlxcdTJkYjgtXFx1MmRiZVxcdTJkYzAtXFx1MmRjNlxcdTJkYzgtXFx1MmRjZVxcdTJkZDAtXFx1MmRkNlxcdTJkZDgtXFx1MmRkZVxcdTJkZTAtXFx1MmRmZlxcdTJlMmZcXHUzMDA1LVxcdTMwMDdcXHUzMDIxLVxcdTMwMmZcXHUzMDMxLVxcdTMwMzVcXHUzMDM4LVxcdTMwM2NcXHUzMDQxLVxcdTMwOTZcXHUzMDk5XFx1MzA5YVxcdTMwOWQtXFx1MzA5ZlxcdTMwYTEtXFx1MzBmYVxcdTMwZmMtXFx1MzBmZlxcdTMxMDUtXFx1MzEyZFxcdTMxMzEtXFx1MzE4ZVxcdTMxYTAtXFx1MzFiYVxcdTMxZjAtXFx1MzFmZlxcdTM0MDAtXFx1NGRiNVxcdTRlMDAtXFx1OWZjY1xcdWEwMDAtXFx1YTQ4Y1xcdWE0ZDAtXFx1YTRmZFxcdWE1MDAtXFx1YTYwY1xcdWE2MTAtXFx1YTYyYlxcdWE2NDAtXFx1YTY2ZlxcdWE2NzQtXFx1YTY3ZFxcdWE2N2YtXFx1YTY5N1xcdWE2OWYtXFx1YTZmMVxcdWE3MTctXFx1YTcxZlxcdWE3MjItXFx1YTc4OFxcdWE3OGItXFx1YTc4ZVxcdWE3OTAtXFx1YTc5M1xcdWE3YTAtXFx1YTdhYVxcdWE3ZjgtXFx1YTgyN1xcdWE4NDAtXFx1YTg3M1xcdWE4ODAtXFx1YThjNFxcdWE4ZDAtXFx1YThkOVxcdWE4ZTAtXFx1YThmN1xcdWE4ZmJcXHVhOTAwLVxcdWE5MmRcXHVhOTMwLVxcdWE5NTNcXHVhOTYwLVxcdWE5N2NcXHVhOTgwLVxcdWE5YzBcXHVhOWNmLVxcdWE5ZDlcXHVhYTAwLVxcdWFhMzZcXHVhYTQwLVxcdWFhNGRcXHVhYTUwLVxcdWFhNTlcXHVhYTYwLVxcdWFhNzZcXHVhYTdhXFx1YWE3YlxcdWFhODAtXFx1YWFjMlxcdWFhZGItXFx1YWFkZFxcdWFhZTAtXFx1YWFlZlxcdWFhZjItXFx1YWFmNlxcdWFiMDEtXFx1YWIwNlxcdWFiMDktXFx1YWIwZVxcdWFiMTEtXFx1YWIxNlxcdWFiMjAtXFx1YWIyNlxcdWFiMjgtXFx1YWIyZVxcdWFiYzAtXFx1YWJlYVxcdWFiZWNcXHVhYmVkXFx1YWJmMC1cXHVhYmY5XFx1YWMwMC1cXHVkN2EzXFx1ZDdiMC1cXHVkN2M2XFx1ZDdjYi1cXHVkN2ZiXFx1ZjkwMC1cXHVmYTZkXFx1ZmE3MC1cXHVmYWQ5XFx1ZmIwMC1cXHVmYjA2XFx1ZmIxMy1cXHVmYjE3XFx1ZmIxZC1cXHVmYjI4XFx1ZmIyYS1cXHVmYjM2XFx1ZmIzOC1cXHVmYjNjXFx1ZmIzZVxcdWZiNDBcXHVmYjQxXFx1ZmI0M1xcdWZiNDRcXHVmYjQ2LVxcdWZiYjFcXHVmYmQzLVxcdWZkM2RcXHVmZDUwLVxcdWZkOGZcXHVmZDkyLVxcdWZkYzdcXHVmZGYwLVxcdWZkZmJcXHVmZTAwLVxcdWZlMGZcXHVmZTIwLVxcdWZlMjZcXHVmZTMzXFx1ZmUzNFxcdWZlNGQtXFx1ZmU0ZlxcdWZlNzAtXFx1ZmU3NFxcdWZlNzYtXFx1ZmVmY1xcdWZmMTAtXFx1ZmYxOVxcdWZmMjEtXFx1ZmYzYVxcdWZmM2ZcXHVmZjQxLVxcdWZmNWFcXHVmZjY2LVxcdWZmYmVcXHVmZmMyLVxcdWZmYzdcXHVmZmNhLVxcdWZmY2ZcXHVmZmQyLVxcdWZmZDdcXHVmZmRhLVxcdWZmZGNdJylcbiAgICB9O1xuXG4gICAgLy8gRW5zdXJlIHRoZSBjb25kaXRpb24gaXMgdHJ1ZSwgb3RoZXJ3aXNlIHRocm93IGFuIGVycm9yLlxuICAgIC8vIFRoaXMgaXMgb25seSB0byBoYXZlIGEgYmV0dGVyIGNvbnRyYWN0IHNlbWFudGljLCBpLmUuIGFub3RoZXIgc2FmZXR5IG5ldFxuICAgIC8vIHRvIGNhdGNoIGEgbG9naWMgZXJyb3IuIFRoZSBjb25kaXRpb24gc2hhbGwgYmUgZnVsZmlsbGVkIGluIG5vcm1hbCBjYXNlLlxuICAgIC8vIERvIE5PVCB1c2UgdGhpcyB0byBlbmZvcmNlIGEgY2VydGFpbiBjb25kaXRpb24gb24gYW55IHVzZXIgaW5wdXQuXG5cbiAgICBmdW5jdGlvbiBhc3NlcnQoY29uZGl0aW9uLCBtZXNzYWdlKSB7XG4gICAgICAgIGlmICghY29uZGl0aW9uKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FTU0VSVDogJyArIG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2xpY2VTb3VyY2UoZnJvbSwgdG8pIHtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5zbGljZShmcm9tLCB0byk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiAnZXNwcmltYSdbMF0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHNsaWNlU291cmNlID0gZnVuY3Rpb24gc2xpY2VBcnJheVNvdXJjZShmcm9tLCB0bykge1xuICAgICAgICAgICAgcmV0dXJuIHNvdXJjZS5zbGljZShmcm9tLCB0bykuam9pbignJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNEZWNpbWFsRGlnaXQoY2gpIHtcbiAgICAgICAgcmV0dXJuICcwMTIzNDU2Nzg5Jy5pbmRleE9mKGNoKSA+PSAwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzSGV4RGlnaXQoY2gpIHtcbiAgICAgICAgcmV0dXJuICcwMTIzNDU2Nzg5YWJjZGVmQUJDREVGJy5pbmRleE9mKGNoKSA+PSAwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzT2N0YWxEaWdpdChjaCkge1xuICAgICAgICByZXR1cm4gJzAxMjM0NTY3Jy5pbmRleE9mKGNoKSA+PSAwO1xuICAgIH1cblxuXG4gICAgLy8gNy4yIFdoaXRlIFNwYWNlXG5cbiAgICBmdW5jdGlvbiBpc1doaXRlU3BhY2UoY2gpIHtcbiAgICAgICAgcmV0dXJuIChjaCA9PT0gJyAnKSB8fCAoY2ggPT09ICdcXHUwMDA5JykgfHwgKGNoID09PSAnXFx1MDAwQicpIHx8XG4gICAgICAgICAgICAoY2ggPT09ICdcXHUwMDBDJykgfHwgKGNoID09PSAnXFx1MDBBMCcpIHx8XG4gICAgICAgICAgICAoY2guY2hhckNvZGVBdCgwKSA+PSAweDE2ODAgJiZcbiAgICAgICAgICAgICAnXFx1MTY4MFxcdTE4MEVcXHUyMDAwXFx1MjAwMVxcdTIwMDJcXHUyMDAzXFx1MjAwNFxcdTIwMDVcXHUyMDA2XFx1MjAwN1xcdTIwMDhcXHUyMDA5XFx1MjAwQVxcdTIwMkZcXHUyMDVGXFx1MzAwMFxcdUZFRkYnLmluZGV4T2YoY2gpID49IDApO1xuICAgIH1cblxuICAgIC8vIDcuMyBMaW5lIFRlcm1pbmF0b3JzXG5cbiAgICBmdW5jdGlvbiBpc0xpbmVUZXJtaW5hdG9yKGNoKSB7XG4gICAgICAgIHJldHVybiAoY2ggPT09ICdcXG4nIHx8IGNoID09PSAnXFxyJyB8fCBjaCA9PT0gJ1xcdTIwMjgnIHx8IGNoID09PSAnXFx1MjAyOScpO1xuICAgIH1cblxuICAgIC8vIDcuNiBJZGVudGlmaWVyIE5hbWVzIGFuZCBJZGVudGlmaWVyc1xuXG4gICAgZnVuY3Rpb24gaXNJZGVudGlmaWVyU3RhcnQoY2gpIHtcbiAgICAgICAgcmV0dXJuIChjaCA9PT0gJyQnKSB8fCAoY2ggPT09ICdfJykgfHwgKGNoID09PSAnXFxcXCcpIHx8XG4gICAgICAgICAgICAoY2ggPj0gJ2EnICYmIGNoIDw9ICd6JykgfHwgKGNoID49ICdBJyAmJiBjaCA8PSAnWicpIHx8XG4gICAgICAgICAgICAoKGNoLmNoYXJDb2RlQXQoMCkgPj0gMHg4MCkgJiYgUmVnZXguTm9uQXNjaWlJZGVudGlmaWVyU3RhcnQudGVzdChjaCkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzSWRlbnRpZmllclBhcnQoY2gpIHtcbiAgICAgICAgcmV0dXJuIChjaCA9PT0gJyQnKSB8fCAoY2ggPT09ICdfJykgfHwgKGNoID09PSAnXFxcXCcpIHx8XG4gICAgICAgICAgICAoY2ggPj0gJ2EnICYmIGNoIDw9ICd6JykgfHwgKGNoID49ICdBJyAmJiBjaCA8PSAnWicpIHx8XG4gICAgICAgICAgICAoKGNoID49ICcwJykgJiYgKGNoIDw9ICc5JykpIHx8XG4gICAgICAgICAgICAoKGNoLmNoYXJDb2RlQXQoMCkgPj0gMHg4MCkgJiYgUmVnZXguTm9uQXNjaWlJZGVudGlmaWVyUGFydC50ZXN0KGNoKSk7XG4gICAgfVxuXG4gICAgLy8gNy42LjEuMiBGdXR1cmUgUmVzZXJ2ZWQgV29yZHNcblxuICAgIGZ1bmN0aW9uIGlzRnV0dXJlUmVzZXJ2ZWRXb3JkKGlkKSB7XG4gICAgICAgIHN3aXRjaCAoaWQpIHtcblxuICAgICAgICAvLyBGdXR1cmUgcmVzZXJ2ZWQgd29yZHMuXG4gICAgICAgIGNhc2UgJ2NsYXNzJzpcbiAgICAgICAgY2FzZSAnZW51bSc6XG4gICAgICAgIGNhc2UgJ2V4cG9ydCc6XG4gICAgICAgIGNhc2UgJ2V4dGVuZHMnOlxuICAgICAgICBjYXNlICdpbXBvcnQnOlxuICAgICAgICBjYXNlICdzdXBlcic6XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1N0cmljdE1vZGVSZXNlcnZlZFdvcmQoaWQpIHtcbiAgICAgICAgc3dpdGNoIChpZCkge1xuXG4gICAgICAgIC8vIFN0cmljdCBNb2RlIHJlc2VydmVkIHdvcmRzLlxuICAgICAgICBjYXNlICdpbXBsZW1lbnRzJzpcbiAgICAgICAgY2FzZSAnaW50ZXJmYWNlJzpcbiAgICAgICAgY2FzZSAncGFja2FnZSc6XG4gICAgICAgIGNhc2UgJ3ByaXZhdGUnOlxuICAgICAgICBjYXNlICdwcm90ZWN0ZWQnOlxuICAgICAgICBjYXNlICdwdWJsaWMnOlxuICAgICAgICBjYXNlICdzdGF0aWMnOlxuICAgICAgICBjYXNlICd5aWVsZCc6XG4gICAgICAgIGNhc2UgJ2xldCc6XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1Jlc3RyaWN0ZWRXb3JkKGlkKSB7XG4gICAgICAgIHJldHVybiBpZCA9PT0gJ2V2YWwnIHx8IGlkID09PSAnYXJndW1lbnRzJztcbiAgICB9XG5cbiAgICAvLyA3LjYuMS4xIEtleXdvcmRzXG5cbiAgICBmdW5jdGlvbiBpc0tleXdvcmQoaWQpIHtcbiAgICAgICAgdmFyIGtleXdvcmQgPSBmYWxzZTtcbiAgICAgICAgc3dpdGNoIChpZC5sZW5ndGgpIHtcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAga2V5d29yZCA9IChpZCA9PT0gJ2lmJykgfHwgKGlkID09PSAnaW4nKSB8fCAoaWQgPT09ICdkbycpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgIGtleXdvcmQgPSAoaWQgPT09ICd2YXInKSB8fCAoaWQgPT09ICdmb3InKSB8fCAoaWQgPT09ICduZXcnKSB8fCAoaWQgPT09ICd0cnknKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAndGhpcycpIHx8IChpZCA9PT0gJ2Vsc2UnKSB8fCAoaWQgPT09ICdjYXNlJykgfHwgKGlkID09PSAndm9pZCcpIHx8IChpZCA9PT0gJ3dpdGgnKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDU6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAnd2hpbGUnKSB8fCAoaWQgPT09ICdicmVhaycpIHx8IChpZCA9PT0gJ2NhdGNoJykgfHwgKGlkID09PSAndGhyb3cnKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDY6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAncmV0dXJuJykgfHwgKGlkID09PSAndHlwZW9mJykgfHwgKGlkID09PSAnZGVsZXRlJykgfHwgKGlkID09PSAnc3dpdGNoJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSA3OlxuICAgICAgICAgICAga2V5d29yZCA9IChpZCA9PT0gJ2RlZmF1bHQnKSB8fCAoaWQgPT09ICdmaW5hbGx5Jyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSA4OlxuICAgICAgICAgICAga2V5d29yZCA9IChpZCA9PT0gJ2Z1bmN0aW9uJykgfHwgKGlkID09PSAnY29udGludWUnKSB8fCAoaWQgPT09ICdkZWJ1Z2dlcicpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMTA6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAnaW5zdGFuY2VvZicpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoa2V5d29yZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBzd2l0Y2ggKGlkKSB7XG4gICAgICAgIC8vIEZ1dHVyZSByZXNlcnZlZCB3b3Jkcy5cbiAgICAgICAgLy8gJ2NvbnN0JyBpcyBzcGVjaWFsaXplZCBhcyBLZXl3b3JkIGluIFY4LlxuICAgICAgICBjYXNlICdjb25zdCc6XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcblxuICAgICAgICAvLyBGb3IgY29tcGF0aWJsaXR5IHRvIFNwaWRlck1vbmtleSBhbmQgRVMubmV4dFxuICAgICAgICBjYXNlICd5aWVsZCc6XG4gICAgICAgIGNhc2UgJ2xldCc6XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzdHJpY3QgJiYgaXNTdHJpY3RNb2RlUmVzZXJ2ZWRXb3JkKGlkKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaXNGdXR1cmVSZXNlcnZlZFdvcmQoaWQpO1xuICAgIH1cblxuICAgIC8vIDcuNCBDb21tZW50c1xuXG4gICAgZnVuY3Rpb24gc2tpcENvbW1lbnQoKSB7XG4gICAgICAgIHZhciBjaCwgYmxvY2tDb21tZW50LCBsaW5lQ29tbWVudDtcblxuICAgICAgICBibG9ja0NvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgbGluZUNvbW1lbnQgPSBmYWxzZTtcblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcblxuICAgICAgICAgICAgaWYgKGxpbmVDb21tZW50KSB7XG4gICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgaWYgKGlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVDb21tZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ1xccicgJiYgc291cmNlW2luZGV4XSA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKytsaW5lTnVtYmVyO1xuICAgICAgICAgICAgICAgICAgICBsaW5lU3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGJsb2NrQ29tbWVudCkge1xuICAgICAgICAgICAgICAgIGlmIChpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICdcXHInICYmIHNvdXJjZVtpbmRleCArIDFdID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICArK2xpbmVOdW1iZXI7XG4gICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVTdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJyonKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICcvJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tDb21tZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCArIDFdO1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ICs9IDI7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVDb21tZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnKicpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggKz0gMjtcbiAgICAgICAgICAgICAgICAgICAgYmxvY2tDb21tZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChpc1doaXRlU3BhY2UoY2gpKSB7XG4gICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gICdcXHInICYmIHNvdXJjZVtpbmRleF0gPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICsrbGluZU51bWJlcjtcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzY2FuSGV4RXNjYXBlKHByZWZpeCkge1xuICAgICAgICB2YXIgaSwgbGVuLCBjaCwgY29kZSA9IDA7XG5cbiAgICAgICAgbGVuID0gKHByZWZpeCA9PT0gJ3UnKSA/IDQgOiAyO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgICAgIGlmIChpbmRleCA8IGxlbmd0aCAmJiBpc0hleERpZ2l0KHNvdXJjZVtpbmRleF0pKSB7XG4gICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgY29kZSA9IGNvZGUgKiAxNiArICcwMTIzNDU2Nzg5YWJjZGVmJy5pbmRleE9mKGNoLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2NhbklkZW50aWZpZXIoKSB7XG4gICAgICAgIHZhciBjaCwgc3RhcnQsIGlkLCByZXN0b3JlO1xuXG4gICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgaWYgKCFpc0lkZW50aWZpZXJTdGFydChjaCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXJ0ID0gaW5kZXg7XG4gICAgICAgIGlmIChjaCA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgaWYgKHNvdXJjZVtpbmRleF0gIT09ICd1Jykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICByZXN0b3JlID0gaW5kZXg7XG4gICAgICAgICAgICBjaCA9IHNjYW5IZXhFc2NhcGUoJ3UnKTtcbiAgICAgICAgICAgIGlmIChjaCkge1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ1xcXFwnIHx8ICFpc0lkZW50aWZpZXJTdGFydChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZCA9IGNoO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbmRleCA9IHJlc3RvcmU7XG4gICAgICAgICAgICAgICAgaWQgPSAndSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgaWYgKCFpc0lkZW50aWZpZXJQYXJ0KGNoKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNoID09PSAnXFxcXCcpIHtcbiAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgIGlmIChzb3VyY2VbaW5kZXhdICE9PSAndScpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgIHJlc3RvcmUgPSBpbmRleDtcbiAgICAgICAgICAgICAgICBjaCA9IHNjYW5IZXhFc2NhcGUoJ3UnKTtcbiAgICAgICAgICAgICAgICBpZiAoY2gpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAnXFxcXCcgfHwgIWlzSWRlbnRpZmllclBhcnQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWQgKz0gY2g7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggPSByZXN0b3JlO1xuICAgICAgICAgICAgICAgICAgICBpZCArPSAndSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZCArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUaGVyZSBpcyBubyBrZXl3b3JkIG9yIGxpdGVyYWwgd2l0aCBvbmx5IG9uZSBjaGFyYWN0ZXIuXG4gICAgICAgIC8vIFRodXMsIGl0IG11c3QgYmUgYW4gaWRlbnRpZmllci5cbiAgICAgICAgaWYgKGlkLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5JZGVudGlmaWVyLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBpZCxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc0tleXdvcmQoaWQpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLktleXdvcmQsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGlkLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gNy44LjEgTnVsbCBMaXRlcmFsc1xuXG4gICAgICAgIGlmIChpZCA9PT0gJ251bGwnKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLk51bGxMaXRlcmFsLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBpZCxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIDcuOC4yIEJvb2xlYW4gTGl0ZXJhbHNcblxuICAgICAgICBpZiAoaWQgPT09ICd0cnVlJyB8fCBpZCA9PT0gJ2ZhbHNlJykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5Cb29sZWFuTGl0ZXJhbCxcbiAgICAgICAgICAgICAgICB2YWx1ZTogaWQsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogVG9rZW4uSWRlbnRpZmllcixcbiAgICAgICAgICAgIHZhbHVlOiBpZCxcbiAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDcuNyBQdW5jdHVhdG9yc1xuXG4gICAgZnVuY3Rpb24gc2NhblB1bmN0dWF0b3IoKSB7XG4gICAgICAgIHZhciBzdGFydCA9IGluZGV4LFxuICAgICAgICAgICAgY2gxID0gc291cmNlW2luZGV4XSxcbiAgICAgICAgICAgIGNoMixcbiAgICAgICAgICAgIGNoMyxcbiAgICAgICAgICAgIGNoNDtcblxuICAgICAgICAvLyBDaGVjayBmb3IgbW9zdCBjb21tb24gc2luZ2xlLWNoYXJhY3RlciBwdW5jdHVhdG9ycy5cblxuICAgICAgICBpZiAoY2gxID09PSAnOycgfHwgY2gxID09PSAneycgfHwgY2gxID09PSAnfScpIHtcbiAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGNoMSxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaDEgPT09ICcsJyB8fCBjaDEgPT09ICcoJyB8fCBjaDEgPT09ICcpJykge1xuICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogY2gxLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRG90ICguKSBjYW4gYWxzbyBzdGFydCBhIGZsb2F0aW5nLXBvaW50IG51bWJlciwgaGVuY2UgdGhlIG5lZWRcbiAgICAgICAgLy8gdG8gY2hlY2sgdGhlIG5leHQgY2hhcmFjdGVyLlxuXG4gICAgICAgIGNoMiA9IHNvdXJjZVtpbmRleCArIDFdO1xuICAgICAgICBpZiAoY2gxID09PSAnLicgJiYgIWlzRGVjaW1hbERpZ2l0KGNoMikpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogc291cmNlW2luZGV4KytdLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUGVlayBtb3JlIGNoYXJhY3RlcnMuXG5cbiAgICAgICAgY2gzID0gc291cmNlW2luZGV4ICsgMl07XG4gICAgICAgIGNoNCA9IHNvdXJjZVtpbmRleCArIDNdO1xuXG4gICAgICAgIC8vIDQtY2hhcmFjdGVyIHB1bmN0dWF0b3I6ID4+Pj1cblxuICAgICAgICBpZiAoY2gxID09PSAnPicgJiYgY2gyID09PSAnPicgJiYgY2gzID09PSAnPicpIHtcbiAgICAgICAgICAgIGlmIChjaDQgPT09ICc9Jykge1xuICAgICAgICAgICAgICAgIGluZGV4ICs9IDQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICc+Pj49JyxcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyAzLWNoYXJhY3RlciBwdW5jdHVhdG9yczogPT09ICE9PSA+Pj4gPDw9ID4+PVxuXG4gICAgICAgIGlmIChjaDEgPT09ICc9JyAmJiBjaDIgPT09ICc9JyAmJiBjaDMgPT09ICc9Jykge1xuICAgICAgICAgICAgaW5kZXggKz0gMztcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogJz09PScsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2gxID09PSAnIScgJiYgY2gyID09PSAnPScgJiYgY2gzID09PSAnPScpIHtcbiAgICAgICAgICAgIGluZGV4ICs9IDM7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgdmFsdWU6ICchPT0nLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoMSA9PT0gJz4nICYmIGNoMiA9PT0gJz4nICYmIGNoMyA9PT0gJz4nKSB7XG4gICAgICAgICAgICBpbmRleCArPSAzO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAnPj4+JyxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaDEgPT09ICc8JyAmJiBjaDIgPT09ICc8JyAmJiBjaDMgPT09ICc9Jykge1xuICAgICAgICAgICAgaW5kZXggKz0gMztcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogJzw8PScsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2gxID09PSAnPicgJiYgY2gyID09PSAnPicgJiYgY2gzID09PSAnPScpIHtcbiAgICAgICAgICAgIGluZGV4ICs9IDM7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgdmFsdWU6ICc+Pj0nLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gMi1jaGFyYWN0ZXIgcHVuY3R1YXRvcnM6IDw9ID49ID09ICE9ICsrIC0tIDw8ID4+ICYmIHx8XG4gICAgICAgIC8vICs9IC09ICo9ICU9ICY9IHw9IF49IC89XG5cbiAgICAgICAgaWYgKGNoMiA9PT0gJz0nKSB7XG4gICAgICAgICAgICBpZiAoJzw+PSErLSolJnxeLycuaW5kZXhPZihjaDEpID49IDApIHtcbiAgICAgICAgICAgICAgICBpbmRleCArPSAyO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBjaDEgKyBjaDIsXG4gICAgICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoMSA9PT0gY2gyICYmICgnKy08PiZ8Jy5pbmRleE9mKGNoMSkgPj0gMCkpIHtcbiAgICAgICAgICAgIGlmICgnKy08PiZ8Jy5pbmRleE9mKGNoMikgPj0gMCkge1xuICAgICAgICAgICAgICAgIGluZGV4ICs9IDI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGNoMSArIGNoMixcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUaGUgcmVtYWluaW5nIDEtY2hhcmFjdGVyIHB1bmN0dWF0b3JzLlxuXG4gICAgICAgIGlmICgnW108PistKiUmfF4hfj86PS8nLmluZGV4T2YoY2gxKSA+PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgdmFsdWU6IHNvdXJjZVtpbmRleCsrXSxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIDcuOC4zIE51bWVyaWMgTGl0ZXJhbHNcblxuICAgIGZ1bmN0aW9uIHNjYW5OdW1lcmljTGl0ZXJhbCgpIHtcbiAgICAgICAgdmFyIG51bWJlciwgc3RhcnQsIGNoO1xuXG4gICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgYXNzZXJ0KGlzRGVjaW1hbERpZ2l0KGNoKSB8fCAoY2ggPT09ICcuJyksXG4gICAgICAgICAgICAnTnVtZXJpYyBsaXRlcmFsIG11c3Qgc3RhcnQgd2l0aCBhIGRlY2ltYWwgZGlnaXQgb3IgYSBkZWNpbWFsIHBvaW50Jyk7XG5cbiAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgICAgbnVtYmVyID0gJyc7XG4gICAgICAgIGlmIChjaCAhPT0gJy4nKSB7XG4gICAgICAgICAgICBudW1iZXIgPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG5cbiAgICAgICAgICAgIC8vIEhleCBudW1iZXIgc3RhcnRzIHdpdGggJzB4Jy5cbiAgICAgICAgICAgIC8vIE9jdGFsIG51bWJlciBzdGFydHMgd2l0aCAnMCcuXG4gICAgICAgICAgICBpZiAobnVtYmVyID09PSAnMCcpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICd4JyB8fCBjaCA9PT0gJ1gnKSB7XG4gICAgICAgICAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0hleERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChudW1iZXIubGVuZ3RoIDw9IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgMHhcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzSWRlbnRpZmllclN0YXJ0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uTnVtZXJpY0xpdGVyYWwsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcGFyc2VJbnQobnVtYmVyLCAxNiksXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzT2N0YWxEaWdpdChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzT2N0YWxEaWdpdChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0lkZW50aWZpZXJTdGFydChjaCkgfHwgaXNEZWNpbWFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5OdW1lcmljTGl0ZXJhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBwYXJzZUludChudW1iZXIsIDgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgb2N0YWw6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBkZWNpbWFsIG51bWJlciBzdGFydHMgd2l0aCAnMCcgc3VjaCBhcyAnMDknIGlzIGlsbGVnYWwuXG4gICAgICAgICAgICAgICAgaWYgKGlzRGVjaW1hbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgaWYgKCFpc0RlY2ltYWxEaWdpdChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2ggPT09ICcuJykge1xuICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzRGVjaW1hbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaCA9PT0gJ2UnIHx8IGNoID09PSAnRScpIHtcbiAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG5cbiAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgIGlmIChjaCA9PT0gJysnIHx8IGNoID09PSAnLScpIHtcbiAgICAgICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICBpZiAoaXNEZWNpbWFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWlzRGVjaW1hbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNoID0gJ2NoYXJhY3RlciAnICsgY2g7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBjaCA9ICc8ZW5kPic7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgaWYgKGlzSWRlbnRpZmllclN0YXJ0KGNoKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBUb2tlbi5OdW1lcmljTGl0ZXJhbCxcbiAgICAgICAgICAgIHZhbHVlOiBwYXJzZUZsb2F0KG51bWJlciksXG4gICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyA3LjguNCBTdHJpbmcgTGl0ZXJhbHNcblxuICAgIGZ1bmN0aW9uIHNjYW5TdHJpbmdMaXRlcmFsKCkge1xuICAgICAgICB2YXIgc3RyID0gJycsIHF1b3RlLCBzdGFydCwgY2gsIGNvZGUsIHVuZXNjYXBlZCwgcmVzdG9yZSwgb2N0YWwgPSBmYWxzZTtcblxuICAgICAgICBxdW90ZSA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgIGFzc2VydCgocXVvdGUgPT09ICdcXCcnIHx8IHF1b3RlID09PSAnXCInKSxcbiAgICAgICAgICAgICdTdHJpbmcgbGl0ZXJhbCBtdXN0IHN0YXJ0cyB3aXRoIGEgcXVvdGUnKTtcblxuICAgICAgICBzdGFydCA9IGluZGV4O1xuICAgICAgICArK2luZGV4O1xuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG5cbiAgICAgICAgICAgIGlmIChjaCA9PT0gcXVvdGUpIHtcbiAgICAgICAgICAgICAgICBxdW90ZSA9ICcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgaWYgKCFpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ24nOlxuICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9ICdcXG4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3InOlxuICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9ICdcXHInO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3QnOlxuICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9ICdcXHQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3UnOlxuICAgICAgICAgICAgICAgICAgICBjYXNlICd4JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3RvcmUgPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVuZXNjYXBlZCA9IHNjYW5IZXhFc2NhcGUoY2gpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHVuZXNjYXBlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSB1bmVzY2FwZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4ID0gcmVzdG9yZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gY2g7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnYic6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcYic7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZic6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcZic7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndic6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xceDBCJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNPY3RhbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGUgPSAnMDEyMzQ1NjcnLmluZGV4T2YoY2gpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gXFwwIGlzIG5vdCBvY3RhbCBlc2NhcGUgc2VxdWVuY2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29kZSAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvY3RhbCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4IDwgbGVuZ3RoICYmIGlzT2N0YWxEaWdpdChzb3VyY2VbaW5kZXhdKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvY3RhbCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGUgPSBjb2RlICogOCArICcwMTIzNDU2NycuaW5kZXhPZihzb3VyY2VbaW5kZXgrK10pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDMgZGlnaXRzIGFyZSBvbmx5IGFsbG93ZWQgd2hlbiBzdHJpbmcgc3RhcnRzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdpdGggMCwgMSwgMiwgM1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJzAxMjMnLmluZGV4T2YoY2gpID49IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmRleCA8IGxlbmd0aCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzT2N0YWxEaWdpdChzb3VyY2VbaW5kZXhdKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZSA9IGNvZGUgKiA4ICsgJzAxMjM0NTY3Jy5pbmRleE9mKHNvdXJjZVtpbmRleCsrXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSBjaDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgKytsaW5lTnVtYmVyO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICAnXFxyJyAmJiBzb3VyY2VbaW5kZXhdID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RyICs9IGNoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHF1b3RlICE9PSAnJykge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFRva2VuLlN0cmluZ0xpdGVyYWwsXG4gICAgICAgICAgICB2YWx1ZTogc3RyLFxuICAgICAgICAgICAgb2N0YWw6IG9jdGFsLFxuICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2NhblJlZ0V4cCgpIHtcbiAgICAgICAgdmFyIHN0ciwgY2gsIHN0YXJ0LCBwYXR0ZXJuLCBmbGFncywgdmFsdWUsIGNsYXNzTWFya2VyID0gZmFsc2UsIHJlc3RvcmUsIHRlcm1pbmF0ZWQgPSBmYWxzZTtcblxuICAgICAgICBidWZmZXIgPSBudWxsO1xuICAgICAgICBza2lwQ29tbWVudCgpO1xuXG4gICAgICAgIHN0YXJ0ID0gaW5kZXg7XG4gICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgYXNzZXJ0KGNoID09PSAnLycsICdSZWd1bGFyIGV4cHJlc3Npb24gbGl0ZXJhbCBtdXN0IHN0YXJ0IHdpdGggYSBzbGFzaCcpO1xuICAgICAgICBzdHIgPSBzb3VyY2VbaW5kZXgrK107XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgIHN0ciArPSBjaDtcbiAgICAgICAgICAgIGlmIChjbGFzc01hcmtlcikge1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ10nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTWFya2VyID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICdcXFxcJykge1xuICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgLy8gRUNNQS0yNjIgNy44LjVcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbnRlcm1pbmF0ZWRSZWdFeHApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHN0ciArPSBjaDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybWluYXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICdbJykge1xuICAgICAgICAgICAgICAgICAgICBjbGFzc01hcmtlciA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbnRlcm1pbmF0ZWRSZWdFeHApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGVybWluYXRlZCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW50ZXJtaW5hdGVkUmVnRXhwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV4Y2x1ZGUgbGVhZGluZyBhbmQgdHJhaWxpbmcgc2xhc2guXG4gICAgICAgIHBhdHRlcm4gPSBzdHIuc3Vic3RyKDEsIHN0ci5sZW5ndGggLSAyKTtcblxuICAgICAgICBmbGFncyA9ICcnO1xuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgIGlmICghaXNJZGVudGlmaWVyUGFydChjaCkpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgIGlmIChjaCA9PT0gJ1xcXFwnICYmIGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ3UnKSB7XG4gICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIHJlc3RvcmUgPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgY2ggPSBzY2FuSGV4RXNjYXBlKCd1Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmxhZ3MgKz0gY2g7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcXFx1JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoOyByZXN0b3JlIDwgaW5kZXg7ICsrcmVzdG9yZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSBzb3VyY2VbcmVzdG9yZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbmRleCA9IHJlc3RvcmU7XG4gICAgICAgICAgICAgICAgICAgICAgICBmbGFncyArPSAndSc7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcXFx1JztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHN0ciArPSAnXFxcXCc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmbGFncyArPSBjaDtcbiAgICAgICAgICAgICAgICBzdHIgKz0gY2g7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdmFsdWUgPSBuZXcgUmVnRXhwKHBhdHRlcm4sIGZsYWdzKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSW52YWxpZFJlZ0V4cCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbGl0ZXJhbDogc3RyLFxuICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNJZGVudGlmaWVyTmFtZSh0b2tlbikge1xuICAgICAgICByZXR1cm4gdG9rZW4udHlwZSA9PT0gVG9rZW4uSWRlbnRpZmllciB8fFxuICAgICAgICAgICAgdG9rZW4udHlwZSA9PT0gVG9rZW4uS2V5d29yZCB8fFxuICAgICAgICAgICAgdG9rZW4udHlwZSA9PT0gVG9rZW4uQm9vbGVhbkxpdGVyYWwgfHxcbiAgICAgICAgICAgIHRva2VuLnR5cGUgPT09IFRva2VuLk51bGxMaXRlcmFsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkdmFuY2UoKSB7XG4gICAgICAgIHZhciBjaCwgdG9rZW47XG5cbiAgICAgICAgc2tpcENvbW1lbnQoKTtcblxuICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLkVPRixcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbaW5kZXgsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRva2VuID0gc2NhblB1bmN0dWF0b3IoKTtcbiAgICAgICAgaWYgKHR5cGVvZiB0b2tlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiB0b2tlbjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcblxuICAgICAgICBpZiAoY2ggPT09ICdcXCcnIHx8IGNoID09PSAnXCInKSB7XG4gICAgICAgICAgICByZXR1cm4gc2NhblN0cmluZ0xpdGVyYWwoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaCA9PT0gJy4nIHx8IGlzRGVjaW1hbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHNjYW5OdW1lcmljTGl0ZXJhbCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdG9rZW4gPSBzY2FuSWRlbnRpZmllcigpO1xuICAgICAgICBpZiAodHlwZW9mIHRva2VuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxleCgpIHtcbiAgICAgICAgdmFyIHRva2VuO1xuXG4gICAgICAgIGlmIChidWZmZXIpIHtcbiAgICAgICAgICAgIGluZGV4ID0gYnVmZmVyLnJhbmdlWzFdO1xuICAgICAgICAgICAgbGluZU51bWJlciA9IGJ1ZmZlci5saW5lTnVtYmVyO1xuICAgICAgICAgICAgbGluZVN0YXJ0ID0gYnVmZmVyLmxpbmVTdGFydDtcbiAgICAgICAgICAgIHRva2VuID0gYnVmZmVyO1xuICAgICAgICAgICAgYnVmZmVyID0gbnVsbDtcbiAgICAgICAgICAgIHJldHVybiB0b2tlbjtcbiAgICAgICAgfVxuXG4gICAgICAgIGJ1ZmZlciA9IG51bGw7XG4gICAgICAgIHJldHVybiBhZHZhbmNlKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbG9va2FoZWFkKCkge1xuICAgICAgICB2YXIgcG9zLCBsaW5lLCBzdGFydDtcblxuICAgICAgICBpZiAoYnVmZmVyICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgICAgICB9XG5cbiAgICAgICAgcG9zID0gaW5kZXg7XG4gICAgICAgIGxpbmUgPSBsaW5lTnVtYmVyO1xuICAgICAgICBzdGFydCA9IGxpbmVTdGFydDtcbiAgICAgICAgYnVmZmVyID0gYWR2YW5jZSgpO1xuICAgICAgICBpbmRleCA9IHBvcztcbiAgICAgICAgbGluZU51bWJlciA9IGxpbmU7XG4gICAgICAgIGxpbmVTdGFydCA9IHN0YXJ0O1xuXG4gICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIHRydWUgaWYgdGhlcmUgaXMgYSBsaW5lIHRlcm1pbmF0b3IgYmVmb3JlIHRoZSBuZXh0IHRva2VuLlxuXG4gICAgZnVuY3Rpb24gcGVla0xpbmVUZXJtaW5hdG9yKCkge1xuICAgICAgICB2YXIgcG9zLCBsaW5lLCBzdGFydCwgZm91bmQ7XG5cbiAgICAgICAgcG9zID0gaW5kZXg7XG4gICAgICAgIGxpbmUgPSBsaW5lTnVtYmVyO1xuICAgICAgICBzdGFydCA9IGxpbmVTdGFydDtcbiAgICAgICAgc2tpcENvbW1lbnQoKTtcbiAgICAgICAgZm91bmQgPSBsaW5lTnVtYmVyICE9PSBsaW5lO1xuICAgICAgICBpbmRleCA9IHBvcztcbiAgICAgICAgbGluZU51bWJlciA9IGxpbmU7XG4gICAgICAgIGxpbmVTdGFydCA9IHN0YXJ0O1xuXG4gICAgICAgIHJldHVybiBmb3VuZDtcbiAgICB9XG5cbiAgICAvLyBUaHJvdyBhbiBleGNlcHRpb25cblxuICAgIGZ1bmN0aW9uIHRocm93RXJyb3IodG9rZW4sIG1lc3NhZ2VGb3JtYXQpIHtcbiAgICAgICAgdmFyIGVycm9yLFxuICAgICAgICAgICAgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMiksXG4gICAgICAgICAgICBtc2cgPSBtZXNzYWdlRm9ybWF0LnJlcGxhY2UoXG4gICAgICAgICAgICAgICAgLyUoXFxkKS9nLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICh3aG9sZSwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFyZ3NbaW5kZXhdIHx8ICcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgaWYgKHR5cGVvZiB0b2tlbi5saW5lTnVtYmVyID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoJ0xpbmUgJyArIHRva2VuLmxpbmVOdW1iZXIgKyAnOiAnICsgbXNnKTtcbiAgICAgICAgICAgIGVycm9yLmluZGV4ID0gdG9rZW4ucmFuZ2VbMF07XG4gICAgICAgICAgICBlcnJvci5saW5lTnVtYmVyID0gdG9rZW4ubGluZU51bWJlcjtcbiAgICAgICAgICAgIGVycm9yLmNvbHVtbiA9IHRva2VuLnJhbmdlWzBdIC0gbGluZVN0YXJ0ICsgMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVycm9yID0gbmV3IEVycm9yKCdMaW5lICcgKyBsaW5lTnVtYmVyICsgJzogJyArIG1zZyk7XG4gICAgICAgICAgICBlcnJvci5pbmRleCA9IGluZGV4O1xuICAgICAgICAgICAgZXJyb3IubGluZU51bWJlciA9IGxpbmVOdW1iZXI7XG4gICAgICAgICAgICBlcnJvci5jb2x1bW4gPSBpbmRleCAtIGxpbmVTdGFydCArIDE7XG4gICAgICAgIH1cblxuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0aHJvd0Vycm9yVG9sZXJhbnQoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGlmIChleHRyYS5lcnJvcnMpIHtcbiAgICAgICAgICAgICAgICBleHRyYS5lcnJvcnMucHVzaChlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgLy8gVGhyb3cgYW4gZXhjZXB0aW9uIGJlY2F1c2Ugb2YgdGhlIHRva2VuLlxuXG4gICAgZnVuY3Rpb24gdGhyb3dVbmV4cGVjdGVkKHRva2VuKSB7XG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5FT0YpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3IodG9rZW4sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRFT1MpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLk51bWVyaWNMaXRlcmFsKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkTnVtYmVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5TdHJpbmdMaXRlcmFsKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkU3RyaW5nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkSWRlbnRpZmllcik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uS2V5d29yZCkge1xuICAgICAgICAgICAgaWYgKGlzRnV0dXJlUmVzZXJ2ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3IodG9rZW4sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRSZXNlcnZlZCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHN0cmljdCAmJiBpc1N0cmljdE1vZGVSZXNlcnZlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHRva2VuLCBNZXNzYWdlcy5TdHJpY3RSZXNlcnZlZFdvcmQpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93RXJyb3IodG9rZW4sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgdG9rZW4udmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQm9vbGVhbkxpdGVyYWwsIE51bGxMaXRlcmFsLCBvciBQdW5jdHVhdG9yLlxuICAgICAgICB0aHJvd0Vycm9yKHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sIHRva2VuLnZhbHVlKTtcbiAgICB9XG5cbiAgICAvLyBFeHBlY3QgdGhlIG5leHQgdG9rZW4gdG8gbWF0Y2ggdGhlIHNwZWNpZmllZCBwdW5jdHVhdG9yLlxuICAgIC8vIElmIG5vdCwgYW4gZXhjZXB0aW9uIHdpbGwgYmUgdGhyb3duLlxuXG4gICAgZnVuY3Rpb24gZXhwZWN0KHZhbHVlKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxleCgpO1xuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uUHVuY3R1YXRvciB8fCB0b2tlbi52YWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgIHRocm93VW5leHBlY3RlZCh0b2tlbik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBFeHBlY3QgdGhlIG5leHQgdG9rZW4gdG8gbWF0Y2ggdGhlIHNwZWNpZmllZCBrZXl3b3JkLlxuICAgIC8vIElmIG5vdCwgYW4gZXhjZXB0aW9uIHdpbGwgYmUgdGhyb3duLlxuXG4gICAgZnVuY3Rpb24gZXhwZWN0S2V5d29yZChrZXl3b3JkKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxleCgpO1xuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uS2V5d29yZCB8fCB0b2tlbi52YWx1ZSAhPT0ga2V5d29yZCkge1xuICAgICAgICAgICAgdGhyb3dVbmV4cGVjdGVkKHRva2VuKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJldHVybiB0cnVlIGlmIHRoZSBuZXh0IHRva2VuIG1hdGNoZXMgdGhlIHNwZWNpZmllZCBwdW5jdHVhdG9yLlxuXG4gICAgZnVuY3Rpb24gbWF0Y2godmFsdWUpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIHJldHVybiB0b2tlbi50eXBlID09PSBUb2tlbi5QdW5jdHVhdG9yICYmIHRva2VuLnZhbHVlID09PSB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdHJ1ZSBpZiB0aGUgbmV4dCB0b2tlbiBtYXRjaGVzIHRoZSBzcGVjaWZpZWQga2V5d29yZFxuXG4gICAgZnVuY3Rpb24gbWF0Y2hLZXl3b3JkKGtleXdvcmQpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIHJldHVybiB0b2tlbi50eXBlID09PSBUb2tlbi5LZXl3b3JkICYmIHRva2VuLnZhbHVlID09PSBrZXl3b3JkO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB0cnVlIGlmIHRoZSBuZXh0IHRva2VuIGlzIGFuIGFzc2lnbm1lbnQgb3BlcmF0b3JcblxuICAgIGZ1bmN0aW9uIG1hdGNoQXNzaWduKCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsb29rYWhlYWQoKSxcbiAgICAgICAgICAgIG9wID0gdG9rZW4udmFsdWU7XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLlB1bmN0dWF0b3IpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3AgPT09ICc9JyB8fFxuICAgICAgICAgICAgb3AgPT09ICcqPScgfHxcbiAgICAgICAgICAgIG9wID09PSAnLz0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJyU9JyB8fFxuICAgICAgICAgICAgb3AgPT09ICcrPScgfHxcbiAgICAgICAgICAgIG9wID09PSAnLT0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJzw8PScgfHxcbiAgICAgICAgICAgIG9wID09PSAnPj49JyB8fFxuICAgICAgICAgICAgb3AgPT09ICc+Pj49JyB8fFxuICAgICAgICAgICAgb3AgPT09ICcmPScgfHxcbiAgICAgICAgICAgIG9wID09PSAnXj0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJ3w9JztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb25zdW1lU2VtaWNvbG9uKCkge1xuICAgICAgICB2YXIgdG9rZW4sIGxpbmU7XG5cbiAgICAgICAgLy8gQ2F0Y2ggdGhlIHZlcnkgY29tbW9uIGNhc2UgZmlyc3QuXG4gICAgICAgIGlmIChzb3VyY2VbaW5kZXhdID09PSAnOycpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbGluZSA9IGxpbmVOdW1iZXI7XG4gICAgICAgIHNraXBDb21tZW50KCk7XG4gICAgICAgIGlmIChsaW5lTnVtYmVyICE9PSBsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWF0Y2goJzsnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uRU9GICYmICFtYXRjaCgnfScpKSB7XG4gICAgICAgICAgICB0aHJvd1VuZXhwZWN0ZWQodG9rZW4pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIHRydWUgaWYgcHJvdmlkZWQgZXhwcmVzc2lvbiBpcyBMZWZ0SGFuZFNpZGVFeHByZXNzaW9uXG5cbiAgICBmdW5jdGlvbiBpc0xlZnRIYW5kU2lkZShleHByKSB7XG4gICAgICAgIHJldHVybiBleHByLnR5cGUgPT09IFN5bnRheC5JZGVudGlmaWVyIHx8IGV4cHIudHlwZSA9PT0gU3ludGF4Lk1lbWJlckV4cHJlc3Npb247XG4gICAgfVxuXG4gICAgLy8gMTEuMS40IEFycmF5IEluaXRpYWxpc2VyXG5cbiAgICBmdW5jdGlvbiBwYXJzZUFycmF5SW5pdGlhbGlzZXIoKSB7XG4gICAgICAgIHZhciBlbGVtZW50cyA9IFtdO1xuXG4gICAgICAgIGV4cGVjdCgnWycpO1xuXG4gICAgICAgIHdoaWxlICghbWF0Y2goJ10nKSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoKCcsJykpIHtcbiAgICAgICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKG51bGwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIW1hdGNoKCddJykpIHtcbiAgICAgICAgICAgICAgICAgICAgZXhwZWN0KCcsJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCddJyk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5BcnJheUV4cHJlc3Npb24sXG4gICAgICAgICAgICBlbGVtZW50czogZWxlbWVudHNcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMS4xLjUgT2JqZWN0IEluaXRpYWxpc2VyXG5cbiAgICBmdW5jdGlvbiBwYXJzZVByb3BlcnR5RnVuY3Rpb24ocGFyYW0sIGZpcnN0KSB7XG4gICAgICAgIHZhciBwcmV2aW91c1N0cmljdCwgYm9keTtcblxuICAgICAgICBwcmV2aW91c1N0cmljdCA9IHN0cmljdDtcbiAgICAgICAgYm9keSA9IHBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cygpO1xuICAgICAgICBpZiAoZmlyc3QgJiYgc3RyaWN0ICYmIGlzUmVzdHJpY3RlZFdvcmQocGFyYW1bMF0ubmFtZSkpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudChmaXJzdCwgTWVzc2FnZXMuU3RyaWN0UGFyYW1OYW1lKTtcbiAgICAgICAgfVxuICAgICAgICBzdHJpY3QgPSBwcmV2aW91c1N0cmljdDtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkZ1bmN0aW9uRXhwcmVzc2lvbixcbiAgICAgICAgICAgIGlkOiBudWxsLFxuICAgICAgICAgICAgcGFyYW1zOiBwYXJhbSxcbiAgICAgICAgICAgIGRlZmF1bHRzOiBbXSxcbiAgICAgICAgICAgIGJvZHk6IGJvZHksXG4gICAgICAgICAgICByZXN0OiBudWxsLFxuICAgICAgICAgICAgZ2VuZXJhdG9yOiBmYWxzZSxcbiAgICAgICAgICAgIGV4cHJlc3Npb246IGZhbHNlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VPYmplY3RQcm9wZXJ0eUtleSgpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbGV4KCk7XG5cbiAgICAgICAgLy8gTm90ZTogVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgb25seSBmcm9tIHBhcnNlT2JqZWN0UHJvcGVydHkoKSwgd2hlcmVcbiAgICAgICAgLy8gRU9GIGFuZCBQdW5jdHVhdG9yIHRva2VucyBhcmUgYWxyZWFkeSBmaWx0ZXJlZCBvdXQuXG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLlN0cmluZ0xpdGVyYWwgfHwgdG9rZW4udHlwZSA9PT0gVG9rZW4uTnVtZXJpY0xpdGVyYWwpIHtcbiAgICAgICAgICAgIGlmIChzdHJpY3QgJiYgdG9rZW4ub2N0YWwpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQodG9rZW4sIE1lc3NhZ2VzLlN0cmljdE9jdGFsTGl0ZXJhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlTGl0ZXJhbCh0b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICBuYW1lOiB0b2tlbi52YWx1ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlT2JqZWN0UHJvcGVydHkoKSB7XG4gICAgICAgIHZhciB0b2tlbiwga2V5LCBpZCwgcGFyYW07XG5cbiAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uSWRlbnRpZmllcikge1xuXG4gICAgICAgICAgICBpZCA9IHBhcnNlT2JqZWN0UHJvcGVydHlLZXkoKTtcblxuICAgICAgICAgICAgLy8gUHJvcGVydHkgQXNzaWdubWVudDogR2V0dGVyIGFuZCBTZXR0ZXIuXG5cbiAgICAgICAgICAgIGlmICh0b2tlbi52YWx1ZSA9PT0gJ2dldCcgJiYgIW1hdGNoKCc6JykpIHtcbiAgICAgICAgICAgICAgICBrZXkgPSBwYXJzZU9iamVjdFByb3BlcnR5S2V5KCk7XG4gICAgICAgICAgICAgICAgZXhwZWN0KCcoJyk7XG4gICAgICAgICAgICAgICAgZXhwZWN0KCcpJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlByb3BlcnR5LFxuICAgICAgICAgICAgICAgICAgICBrZXk6IGtleSxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHBhcnNlUHJvcGVydHlGdW5jdGlvbihbXSksXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6ICdnZXQnXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG9rZW4udmFsdWUgPT09ICdzZXQnICYmICFtYXRjaCgnOicpKSB7XG4gICAgICAgICAgICAgICAga2V5ID0gcGFyc2VPYmplY3RQcm9wZXJ0eUtleSgpO1xuICAgICAgICAgICAgICAgIGV4cGVjdCgnKCcpO1xuICAgICAgICAgICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgICAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgZXhwZWN0KCcpJyk7XG4gICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh0b2tlbiwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCB0b2tlbi52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguUHJvcGVydHksXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXk6IGtleSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBwYXJzZVByb3BlcnR5RnVuY3Rpb24oW10pLFxuICAgICAgICAgICAgICAgICAgICAgICAga2luZDogJ3NldCdcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwYXJhbSA9IFsgcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKSBdO1xuICAgICAgICAgICAgICAgICAgICBleHBlY3QoJyknKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Qcm9wZXJ0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleToga2V5LFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHBhcnNlUHJvcGVydHlGdW5jdGlvbihwYXJhbSwgdG9rZW4pLFxuICAgICAgICAgICAgICAgICAgICAgICAga2luZDogJ3NldCdcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV4cGVjdCgnOicpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Qcm9wZXJ0eSxcbiAgICAgICAgICAgICAgICAgICAga2V5OiBpZCxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKSxcbiAgICAgICAgICAgICAgICAgICAga2luZDogJ2luaXQnXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5FT0YgfHwgdG9rZW4udHlwZSA9PT0gVG9rZW4uUHVuY3R1YXRvcikge1xuICAgICAgICAgICAgdGhyb3dVbmV4cGVjdGVkKHRva2VuKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGtleSA9IHBhcnNlT2JqZWN0UHJvcGVydHlLZXkoKTtcbiAgICAgICAgICAgIGV4cGVjdCgnOicpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguUHJvcGVydHksXG4gICAgICAgICAgICAgICAga2V5OiBrZXksXG4gICAgICAgICAgICAgICAgdmFsdWU6IHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKSxcbiAgICAgICAgICAgICAgICBraW5kOiAnaW5pdCdcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZU9iamVjdEluaXRpYWxpc2VyKCkge1xuICAgICAgICB2YXIgcHJvcGVydGllcyA9IFtdLCBwcm9wZXJ0eSwgbmFtZSwga2luZCwgbWFwID0ge30sIHRvU3RyaW5nID0gU3RyaW5nO1xuXG4gICAgICAgIGV4cGVjdCgneycpO1xuXG4gICAgICAgIHdoaWxlICghbWF0Y2goJ30nKSkge1xuICAgICAgICAgICAgcHJvcGVydHkgPSBwYXJzZU9iamVjdFByb3BlcnR5KCk7XG5cbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eS5rZXkudHlwZSA9PT0gU3ludGF4LklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgICAgICBuYW1lID0gcHJvcGVydHkua2V5Lm5hbWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5hbWUgPSB0b1N0cmluZyhwcm9wZXJ0eS5rZXkudmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAga2luZCA9IChwcm9wZXJ0eS5raW5kID09PSAnaW5pdCcpID8gUHJvcGVydHlLaW5kLkRhdGEgOiAocHJvcGVydHkua2luZCA9PT0gJ2dldCcpID8gUHJvcGVydHlLaW5kLkdldCA6IFByb3BlcnR5S2luZC5TZXQ7XG4gICAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG1hcCwgbmFtZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAobWFwW25hbWVdID09PSBQcm9wZXJ0eUtpbmQuRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RyaWN0ICYmIGtpbmQgPT09IFByb3BlcnR5S2luZC5EYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLlN0cmljdER1cGxpY2F0ZVByb3BlcnR5KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChraW5kICE9PSBQcm9wZXJ0eUtpbmQuRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5BY2Nlc3NvckRhdGFQcm9wZXJ0eSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoa2luZCA9PT0gUHJvcGVydHlLaW5kLkRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuQWNjZXNzb3JEYXRhUHJvcGVydHkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1hcFtuYW1lXSAmIGtpbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuQWNjZXNzb3JHZXRTZXQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG1hcFtuYW1lXSB8PSBraW5kO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtYXBbbmFtZV0gPSBraW5kO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwcm9wZXJ0aWVzLnB1c2gocHJvcGVydHkpO1xuXG4gICAgICAgICAgICBpZiAoIW1hdGNoKCd9JykpIHtcbiAgICAgICAgICAgICAgICBleHBlY3QoJywnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnfScpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguT2JqZWN0RXhwcmVzc2lvbixcbiAgICAgICAgICAgIHByb3BlcnRpZXM6IHByb3BlcnRpZXNcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMS4xLjYgVGhlIEdyb3VwaW5nIE9wZXJhdG9yXG5cbiAgICBmdW5jdGlvbiBwYXJzZUdyb3VwRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHI7XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgZXhwciA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuXG4gICAgLy8gMTEuMSBQcmltYXJ5IEV4cHJlc3Npb25zXG5cbiAgICBmdW5jdGlvbiBwYXJzZVByaW1hcnlFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsb29rYWhlYWQoKSxcbiAgICAgICAgICAgIHR5cGUgPSB0b2tlbi50eXBlO1xuXG4gICAgICAgIGlmICh0eXBlID09PSBUb2tlbi5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxuICAgICAgICAgICAgICAgIG5hbWU6IGxleCgpLnZhbHVlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGUgPT09IFRva2VuLlN0cmluZ0xpdGVyYWwgfHwgdHlwZSA9PT0gVG9rZW4uTnVtZXJpY0xpdGVyYWwpIHtcbiAgICAgICAgICAgIGlmIChzdHJpY3QgJiYgdG9rZW4ub2N0YWwpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQodG9rZW4sIE1lc3NhZ2VzLlN0cmljdE9jdGFsTGl0ZXJhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlTGl0ZXJhbChsZXgoKSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZSA9PT0gVG9rZW4uS2V5d29yZCkge1xuICAgICAgICAgICAgaWYgKG1hdGNoS2V5d29yZCgndGhpcycpKSB7XG4gICAgICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlRoaXNFeHByZXNzaW9uXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG1hdGNoS2V5d29yZCgnZnVuY3Rpb24nKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUZ1bmN0aW9uRXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGUgPT09IFRva2VuLkJvb2xlYW5MaXRlcmFsKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIHRva2VuLnZhbHVlID0gKHRva2VuLnZhbHVlID09PSAndHJ1ZScpO1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUxpdGVyYWwodG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGUgPT09IFRva2VuLk51bGxMaXRlcmFsKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIHRva2VuLnZhbHVlID0gbnVsbDtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVMaXRlcmFsKHRva2VuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaCgnWycpKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VBcnJheUluaXRpYWxpc2VyKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWF0Y2goJ3snKSkge1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlT2JqZWN0SW5pdGlhbGlzZXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaCgnKCcpKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VHcm91cEV4cHJlc3Npb24oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaCgnLycpIHx8IG1hdGNoKCcvPScpKSB7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlTGl0ZXJhbChzY2FuUmVnRXhwKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRocm93VW5leHBlY3RlZChsZXgoKSk7XG4gICAgfVxuXG4gICAgLy8gMTEuMiBMZWZ0LUhhbmQtU2lkZSBFeHByZXNzaW9uc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VBcmd1bWVudHMoKSB7XG4gICAgICAgIHZhciBhcmdzID0gW107XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgaWYgKCFtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBhcmdzLnB1c2gocGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpKTtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2goJyknKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXhwZWN0KCcsJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICByZXR1cm4gYXJncztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZU5vbkNvbXB1dGVkUHJvcGVydHkoKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxleCgpO1xuXG4gICAgICAgIGlmICghaXNJZGVudGlmaWVyTmFtZSh0b2tlbikpIHtcbiAgICAgICAgICAgIHRocm93VW5leHBlY3RlZCh0b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICBuYW1lOiB0b2tlbi52YWx1ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlTm9uQ29tcHV0ZWRNZW1iZXIoKSB7XG4gICAgICAgIGV4cGVjdCgnLicpO1xuXG4gICAgICAgIHJldHVybiBwYXJzZU5vbkNvbXB1dGVkUHJvcGVydHkoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUNvbXB1dGVkTWVtYmVyKCkge1xuICAgICAgICB2YXIgZXhwcjtcblxuICAgICAgICBleHBlY3QoJ1snKTtcblxuICAgICAgICBleHByID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgZXhwZWN0KCddJyk7XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VOZXdFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwcjtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCduZXcnKTtcblxuICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4Lk5ld0V4cHJlc3Npb24sXG4gICAgICAgICAgICBjYWxsZWU6IHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbigpLFxuICAgICAgICAgICAgJ2FyZ3VtZW50cyc6IFtdXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKG1hdGNoKCcoJykpIHtcbiAgICAgICAgICAgIGV4cHJbJ2FyZ3VtZW50cyddID0gcGFyc2VBcmd1bWVudHMoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbkFsbG93Q2FsbCgpIHtcbiAgICAgICAgdmFyIGV4cHI7XG5cbiAgICAgICAgZXhwciA9IG1hdGNoS2V5d29yZCgnbmV3JykgPyBwYXJzZU5ld0V4cHJlc3Npb24oKSA6IHBhcnNlUHJpbWFyeUV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJy4nKSB8fCBtYXRjaCgnWycpIHx8IG1hdGNoKCcoJykpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaCgnKCcpKSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkNhbGxFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjYWxsZWU6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgICdhcmd1bWVudHMnOiBwYXJzZUFyZ3VtZW50cygpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobWF0Y2goJ1snKSkge1xuICAgICAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjb21wdXRlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiBleHByLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogcGFyc2VDb21wdXRlZE1lbWJlcigpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNvbXB1dGVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiBleHByLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogcGFyc2VOb25Db21wdXRlZE1lbWJlcigpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwcjtcblxuICAgICAgICBleHByID0gbWF0Y2hLZXl3b3JkKCduZXcnKSA/IHBhcnNlTmV3RXhwcmVzc2lvbigpIDogcGFyc2VQcmltYXJ5RXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnLicpIHx8IG1hdGNoKCdbJykpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaCgnWycpKSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNvbXB1dGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwYXJzZUNvbXB1dGVkTWVtYmVyKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgY29tcHV0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwYXJzZU5vbkNvbXB1dGVkTWVtYmVyKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgLy8gMTEuMyBQb3N0Zml4IEV4cHJlc3Npb25zXG5cbiAgICBmdW5jdGlvbiBwYXJzZVBvc3RmaXhFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbkFsbG93Q2FsbCgpLCB0b2tlbjtcblxuICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uUHVuY3R1YXRvcikge1xuICAgICAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoKG1hdGNoKCcrKycpIHx8IG1hdGNoKCctLScpKSAmJiAhcGVla0xpbmVUZXJtaW5hdG9yKCkpIHtcbiAgICAgICAgICAgIC8vIDExLjMuMSwgMTEuMy4yXG4gICAgICAgICAgICBpZiAoc3RyaWN0ICYmIGV4cHIudHlwZSA9PT0gU3ludGF4LklkZW50aWZpZXIgJiYgaXNSZXN0cmljdGVkV29yZChleHByLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5TdHJpY3RMSFNQb3N0Zml4KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFpc0xlZnRIYW5kU2lkZShleHByKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLkludmFsaWRMSFNJbkFzc2lnbm1lbnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5VcGRhdGVFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBsZXgoKS52YWx1ZSxcbiAgICAgICAgICAgICAgICBhcmd1bWVudDogZXhwcixcbiAgICAgICAgICAgICAgICBwcmVmaXg6IGZhbHNlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgLy8gMTEuNCBVbmFyeSBPcGVyYXRvcnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlVW5hcnlFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgdG9rZW4sIGV4cHI7XG5cbiAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLlB1bmN0dWF0b3IgJiYgdG9rZW4udHlwZSAhPT0gVG9rZW4uS2V5d29yZCkge1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlUG9zdGZpeEV4cHJlc3Npb24oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaCgnKysnKSB8fCBtYXRjaCgnLS0nKSkge1xuICAgICAgICAgICAgdG9rZW4gPSBsZXgoKTtcbiAgICAgICAgICAgIGV4cHIgPSBwYXJzZVVuYXJ5RXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgLy8gMTEuNC40LCAxMS40LjVcbiAgICAgICAgICAgIGlmIChzdHJpY3QgJiYgZXhwci50eXBlID09PSBTeW50YXguSWRlbnRpZmllciAmJiBpc1Jlc3RyaWN0ZWRXb3JkKGV4cHIubmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLlN0cmljdExIU1ByZWZpeCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghaXNMZWZ0SGFuZFNpZGUoZXhwcikpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbnZhbGlkTEhTSW5Bc3NpZ25tZW50KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguVXBkYXRlRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogdG9rZW4udmFsdWUsXG4gICAgICAgICAgICAgICAgYXJndW1lbnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcHJlZml4OiB0cnVlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWF0Y2goJysnKSB8fCBtYXRjaCgnLScpIHx8IG1hdGNoKCd+JykgfHwgbWF0Y2goJyEnKSkge1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguVW5hcnlFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBsZXgoKS52YWx1ZSxcbiAgICAgICAgICAgICAgICBhcmd1bWVudDogcGFyc2VVbmFyeUV4cHJlc3Npb24oKSxcbiAgICAgICAgICAgICAgICBwcmVmaXg6IHRydWVcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gZXhwcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ2RlbGV0ZScpIHx8IG1hdGNoS2V5d29yZCgndm9pZCcpIHx8IG1hdGNoS2V5d29yZCgndHlwZW9mJykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlVuYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgYXJndW1lbnQ6IHBhcnNlVW5hcnlFeHByZXNzaW9uKCksXG4gICAgICAgICAgICAgICAgcHJlZml4OiB0cnVlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKHN0cmljdCAmJiBleHByLm9wZXJhdG9yID09PSAnZGVsZXRlJyAmJiBleHByLmFyZ3VtZW50LnR5cGUgPT09IFN5bnRheC5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5TdHJpY3REZWxldGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcGFyc2VQb3N0Zml4RXhwcmVzc2lvbigpO1xuICAgIH1cblxuICAgIC8vIDExLjUgTXVsdGlwbGljYXRpdmUgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZVVuYXJ5RXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnKicpIHx8IG1hdGNoKCcvJykgfHwgbWF0Y2goJyUnKSkge1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VVbmFyeUV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjYgQWRkaXRpdmUgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZUFkZGl0aXZlRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnKycpIHx8IG1hdGNoKCctJykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IGxleCgpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlTXVsdGlwbGljYXRpdmVFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS43IEJpdHdpc2UgU2hpZnQgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZVNoaWZ0RXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUFkZGl0aXZlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnPDwnKSB8fCBtYXRjaCgnPj4nKSB8fCBtYXRjaCgnPj4+JykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IGxleCgpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlQWRkaXRpdmVFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG4gICAgLy8gMTEuOCBSZWxhdGlvbmFsIE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VSZWxhdGlvbmFsRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIsIHByZXZpb3VzQWxsb3dJbjtcblxuICAgICAgICBwcmV2aW91c0FsbG93SW4gPSBzdGF0ZS5hbGxvd0luO1xuICAgICAgICBzdGF0ZS5hbGxvd0luID0gdHJ1ZTtcblxuICAgICAgICBleHByID0gcGFyc2VTaGlmdEV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJzwnKSB8fCBtYXRjaCgnPicpIHx8IG1hdGNoKCc8PScpIHx8IG1hdGNoKCc+PScpIHx8IChwcmV2aW91c0FsbG93SW4gJiYgbWF0Y2hLZXl3b3JkKCdpbicpKSB8fCBtYXRjaEtleXdvcmQoJ2luc3RhbmNlb2YnKSkge1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VTaGlmdEV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXRlLmFsbG93SW4gPSBwcmV2aW91c0FsbG93SW47XG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjkgRXF1YWxpdHkgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZUVxdWFsaXR5RXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZVJlbGF0aW9uYWxFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCc9PScpIHx8IG1hdGNoKCchPScpIHx8IG1hdGNoKCc9PT0nKSB8fCBtYXRjaCgnIT09JykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IGxleCgpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjEwIEJpbmFyeSBCaXR3aXNlIE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VCaXR3aXNlQU5ERXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUVxdWFsaXR5RXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnJicpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6ICcmJyxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZUVxdWFsaXR5RXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUJpdHdpc2VBTkRFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCdeJykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogJ14nLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlQml0d2lzZUFOREV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlQml0d2lzZU9SRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUJpdHdpc2VYT1JFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCd8JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogJ3wnLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlQml0d2lzZVhPUkV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjExIEJpbmFyeSBMb2dpY2FsIE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VMb2dpY2FsQU5ERXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUJpdHdpc2VPUkV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJyYmJykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTG9naWNhbEV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6ICcmJicsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUxvZ2ljYWxPUkV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByID0gcGFyc2VMb2dpY2FsQU5ERXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnfHwnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Mb2dpY2FsRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogJ3x8JyxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZUxvZ2ljYWxBTkRFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS4xMiBDb25kaXRpb25hbCBPcGVyYXRvclxuXG4gICAgZnVuY3Rpb24gcGFyc2VDb25kaXRpb25hbEV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByLCBwcmV2aW91c0FsbG93SW4sIGNvbnNlcXVlbnQ7XG5cbiAgICAgICAgZXhwciA9IHBhcnNlTG9naWNhbE9SRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGlmIChtYXRjaCgnPycpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIHByZXZpb3VzQWxsb3dJbiA9IHN0YXRlLmFsbG93SW47XG4gICAgICAgICAgICBzdGF0ZS5hbGxvd0luID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbnNlcXVlbnQgPSBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCk7XG4gICAgICAgICAgICBzdGF0ZS5hbGxvd0luID0gcHJldmlvdXNBbGxvd0luO1xuICAgICAgICAgICAgZXhwZWN0KCc6Jyk7XG5cbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkNvbmRpdGlvbmFsRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICB0ZXN0OiBleHByLFxuICAgICAgICAgICAgICAgIGNvbnNlcXVlbnQ6IGNvbnNlcXVlbnQsXG4gICAgICAgICAgICAgICAgYWx0ZXJuYXRlOiBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS4xMyBBc3NpZ25tZW50IE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIHRva2VuLCBleHByO1xuXG4gICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIGV4cHIgPSBwYXJzZUNvbmRpdGlvbmFsRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGlmIChtYXRjaEFzc2lnbigpKSB7XG4gICAgICAgICAgICAvLyBMZWZ0SGFuZFNpZGVFeHByZXNzaW9uXG4gICAgICAgICAgICBpZiAoIWlzTGVmdEhhbmRTaWRlKGV4cHIpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSW52YWxpZExIU0luQXNzaWdubWVudCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIDExLjEzLjFcbiAgICAgICAgICAgIGlmIChzdHJpY3QgJiYgZXhwci50eXBlID09PSBTeW50YXguSWRlbnRpZmllciAmJiBpc1Jlc3RyaWN0ZWRXb3JkKGV4cHIubmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQodG9rZW4sIE1lc3NhZ2VzLlN0cmljdExIU0Fzc2lnbm1lbnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Bc3NpZ25tZW50RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgLy8gMTEuMTQgQ29tbWEgT3BlcmF0b3JcblxuICAgIGZ1bmN0aW9uIHBhcnNlRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgaWYgKG1hdGNoKCcsJykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlNlcXVlbmNlRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBleHByZXNzaW9uczogWyBleHByIF1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmICghbWF0Y2goJywnKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICAgICAgZXhwci5leHByZXNzaW9ucy5wdXNoKHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMi4xIEJsb2NrXG5cbiAgICBmdW5jdGlvbiBwYXJzZVN0YXRlbWVudExpc3QoKSB7XG4gICAgICAgIHZhciBsaXN0ID0gW10sXG4gICAgICAgICAgICBzdGF0ZW1lbnQ7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJ30nKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGVtZW50ID0gcGFyc2VTb3VyY2VFbGVtZW50KCk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHN0YXRlbWVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxpc3QucHVzaChzdGF0ZW1lbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VCbG9jaygpIHtcbiAgICAgICAgdmFyIGJsb2NrO1xuXG4gICAgICAgIGV4cGVjdCgneycpO1xuXG4gICAgICAgIGJsb2NrID0gcGFyc2VTdGF0ZW1lbnRMaXN0KCk7XG5cbiAgICAgICAgZXhwZWN0KCd9Jyk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CbG9ja1N0YXRlbWVudCxcbiAgICAgICAgICAgIGJvZHk6IGJsb2NrXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuMiBWYXJpYWJsZSBTdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsZXgoKTtcblxuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uSWRlbnRpZmllcikge1xuICAgICAgICAgICAgdGhyb3dVbmV4cGVjdGVkKHRva2VuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgIG5hbWU6IHRva2VuLnZhbHVlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uKGtpbmQpIHtcbiAgICAgICAgdmFyIGlkID0gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKSxcbiAgICAgICAgICAgIGluaXQgPSBudWxsO1xuXG4gICAgICAgIC8vIDEyLjIuMVxuICAgICAgICBpZiAoc3RyaWN0ICYmIGlzUmVzdHJpY3RlZFdvcmQoaWQubmFtZSkpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuU3RyaWN0VmFyTmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoa2luZCA9PT0gJ2NvbnN0Jykge1xuICAgICAgICAgICAgZXhwZWN0KCc9Jyk7XG4gICAgICAgICAgICBpbml0ID0gcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpO1xuICAgICAgICB9IGVsc2UgaWYgKG1hdGNoKCc9JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgaW5pdCA9IHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguVmFyaWFibGVEZWNsYXJhdG9yLFxuICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgaW5pdDogaW5pdFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbkxpc3Qoa2luZCkge1xuICAgICAgICB2YXIgbGlzdCA9IFtdO1xuXG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIGxpc3QucHVzaChwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb24oa2luZCkpO1xuICAgICAgICAgICAgaWYgKCFtYXRjaCgnLCcpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgfSB3aGlsZSAoaW5kZXggPCBsZW5ndGgpO1xuXG4gICAgICAgIHJldHVybiBsaXN0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlVmFyaWFibGVTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciBkZWNsYXJhdGlvbnM7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgndmFyJyk7XG5cbiAgICAgICAgZGVjbGFyYXRpb25zID0gcGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uTGlzdCgpO1xuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LlZhcmlhYmxlRGVjbGFyYXRpb24sXG4gICAgICAgICAgICBkZWNsYXJhdGlvbnM6IGRlY2xhcmF0aW9ucyxcbiAgICAgICAgICAgIGtpbmQ6ICd2YXInXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8ga2luZCBtYXkgYmUgYGNvbnN0YCBvciBgbGV0YFxuICAgIC8vIEJvdGggYXJlIGV4cGVyaW1lbnRhbCBhbmQgbm90IGluIHRoZSBzcGVjaWZpY2F0aW9uIHlldC5cbiAgICAvLyBzZWUgaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9aGFybW9ueTpjb25zdFxuICAgIC8vIGFuZCBodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OmxldFxuICAgIGZ1bmN0aW9uIHBhcnNlQ29uc3RMZXREZWNsYXJhdGlvbihraW5kKSB7XG4gICAgICAgIHZhciBkZWNsYXJhdGlvbnM7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZChraW5kKTtcblxuICAgICAgICBkZWNsYXJhdGlvbnMgPSBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb25MaXN0KGtpbmQpO1xuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LlZhcmlhYmxlRGVjbGFyYXRpb24sXG4gICAgICAgICAgICBkZWNsYXJhdGlvbnM6IGRlY2xhcmF0aW9ucyxcbiAgICAgICAgICAgIGtpbmQ6IGtpbmRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi4zIEVtcHR5IFN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VFbXB0eVN0YXRlbWVudCgpIHtcbiAgICAgICAgZXhwZWN0KCc7Jyk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5FbXB0eVN0YXRlbWVudFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjQgRXhwcmVzc2lvbiBTdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlRXhwcmVzc2lvblN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBjb25zdW1lU2VtaWNvbG9uKCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5FeHByZXNzaW9uU3RhdGVtZW50LFxuICAgICAgICAgICAgZXhwcmVzc2lvbjogZXhwclxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjUgSWYgc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZUlmU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgdGVzdCwgY29uc2VxdWVudCwgYWx0ZXJuYXRlO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ2lmJyk7XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgdGVzdCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIGNvbnNlcXVlbnQgPSBwYXJzZVN0YXRlbWVudCgpO1xuXG4gICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ2Vsc2UnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICBhbHRlcm5hdGUgPSBwYXJzZVN0YXRlbWVudCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWx0ZXJuYXRlID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguSWZTdGF0ZW1lbnQsXG4gICAgICAgICAgICB0ZXN0OiB0ZXN0LFxuICAgICAgICAgICAgY29uc2VxdWVudDogY29uc2VxdWVudCxcbiAgICAgICAgICAgIGFsdGVybmF0ZTogYWx0ZXJuYXRlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuNiBJdGVyYXRpb24gU3RhdGVtZW50c1xuXG4gICAgZnVuY3Rpb24gcGFyc2VEb1doaWxlU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgYm9keSwgdGVzdCwgb2xkSW5JdGVyYXRpb247XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnZG8nKTtcblxuICAgICAgICBvbGRJbkl0ZXJhdGlvbiA9IHN0YXRlLmluSXRlcmF0aW9uO1xuICAgICAgICBzdGF0ZS5pbkl0ZXJhdGlvbiA9IHRydWU7XG5cbiAgICAgICAgYm9keSA9IHBhcnNlU3RhdGVtZW50KCk7XG5cbiAgICAgICAgc3RhdGUuaW5JdGVyYXRpb24gPSBvbGRJbkl0ZXJhdGlvbjtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCd3aGlsZScpO1xuXG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIHRlc3QgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBpZiAobWF0Y2goJzsnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkRvV2hpbGVTdGF0ZW1lbnQsXG4gICAgICAgICAgICBib2R5OiBib2R5LFxuICAgICAgICAgICAgdGVzdDogdGVzdFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlV2hpbGVTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciB0ZXN0LCBib2R5LCBvbGRJbkl0ZXJhdGlvbjtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCd3aGlsZScpO1xuXG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIHRlc3QgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBvbGRJbkl0ZXJhdGlvbiA9IHN0YXRlLmluSXRlcmF0aW9uO1xuICAgICAgICBzdGF0ZS5pbkl0ZXJhdGlvbiA9IHRydWU7XG5cbiAgICAgICAgYm9keSA9IHBhcnNlU3RhdGVtZW50KCk7XG5cbiAgICAgICAgc3RhdGUuaW5JdGVyYXRpb24gPSBvbGRJbkl0ZXJhdGlvbjtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LldoaWxlU3RhdGVtZW50LFxuICAgICAgICAgICAgdGVzdDogdGVzdCxcbiAgICAgICAgICAgIGJvZHk6IGJvZHlcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUZvclZhcmlhYmxlRGVjbGFyYXRpb24oKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxleCgpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguVmFyaWFibGVEZWNsYXJhdGlvbixcbiAgICAgICAgICAgIGRlY2xhcmF0aW9uczogcGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uTGlzdCgpLFxuICAgICAgICAgICAga2luZDogdG9rZW4udmFsdWVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUZvclN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIGluaXQsIHRlc3QsIHVwZGF0ZSwgbGVmdCwgcmlnaHQsIGJvZHksIG9sZEluSXRlcmF0aW9uO1xuXG4gICAgICAgIGluaXQgPSB0ZXN0ID0gdXBkYXRlID0gbnVsbDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdmb3InKTtcblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICBpZiAobWF0Y2goJzsnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAobWF0Y2hLZXl3b3JkKCd2YXInKSB8fCBtYXRjaEtleXdvcmQoJ2xldCcpKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUuYWxsb3dJbiA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGluaXQgPSBwYXJzZUZvclZhcmlhYmxlRGVjbGFyYXRpb24oKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5hbGxvd0luID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIGlmIChpbml0LmRlY2xhcmF0aW9ucy5sZW5ndGggPT09IDEgJiYgbWF0Y2hLZXl3b3JkKCdpbicpKSB7XG4gICAgICAgICAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgICAgICAgICBsZWZ0ID0gaW5pdDtcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQgPSBwYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgICAgICAgICAgaW5pdCA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5hbGxvd0luID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgaW5pdCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgICAgIHN0YXRlLmFsbG93SW4gPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoS2V5d29yZCgnaW4nKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBMZWZ0SGFuZFNpZGVFeHByZXNzaW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICghaXNMZWZ0SGFuZFNpZGUoaW5pdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLkludmFsaWRMSFNJbkZvckluKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgICAgICAgICBsZWZ0ID0gaW5pdDtcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQgPSBwYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgICAgICAgICAgaW5pdCA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGxlZnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgZXhwZWN0KCc7Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGxlZnQgPT09ICd1bmRlZmluZWQnKSB7XG5cbiAgICAgICAgICAgIGlmICghbWF0Y2goJzsnKSkge1xuICAgICAgICAgICAgICAgIHRlc3QgPSBwYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGV4cGVjdCgnOycpO1xuXG4gICAgICAgICAgICBpZiAoIW1hdGNoKCcpJykpIHtcbiAgICAgICAgICAgICAgICB1cGRhdGUgPSBwYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIG9sZEluSXRlcmF0aW9uID0gc3RhdGUuaW5JdGVyYXRpb247XG4gICAgICAgIHN0YXRlLmluSXRlcmF0aW9uID0gdHJ1ZTtcblxuICAgICAgICBib2R5ID0gcGFyc2VTdGF0ZW1lbnQoKTtcblxuICAgICAgICBzdGF0ZS5pbkl0ZXJhdGlvbiA9IG9sZEluSXRlcmF0aW9uO1xuXG4gICAgICAgIGlmICh0eXBlb2YgbGVmdCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkZvclN0YXRlbWVudCxcbiAgICAgICAgICAgICAgICBpbml0OiBpbml0LFxuICAgICAgICAgICAgICAgIHRlc3Q6IHRlc3QsXG4gICAgICAgICAgICAgICAgdXBkYXRlOiB1cGRhdGUsXG4gICAgICAgICAgICAgICAgYm9keTogYm9keVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguRm9ySW5TdGF0ZW1lbnQsXG4gICAgICAgICAgICBsZWZ0OiBsZWZ0LFxuICAgICAgICAgICAgcmlnaHQ6IHJpZ2h0LFxuICAgICAgICAgICAgYm9keTogYm9keSxcbiAgICAgICAgICAgIGVhY2g6IGZhbHNlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuNyBUaGUgY29udGludWUgc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZUNvbnRpbnVlU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgdG9rZW4sIGxhYmVsID0gbnVsbDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdjb250aW51ZScpO1xuXG4gICAgICAgIC8vIE9wdGltaXplIHRoZSBtb3N0IGNvbW1vbiBmb3JtOiAnY29udGludWU7Jy5cbiAgICAgICAgaWYgKHNvdXJjZVtpbmRleF0gPT09ICc7Jykge1xuICAgICAgICAgICAgbGV4KCk7XG5cbiAgICAgICAgICAgIGlmICghc3RhdGUuaW5JdGVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbGxlZ2FsQ29udGludWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Db250aW51ZVN0YXRlbWVudCxcbiAgICAgICAgICAgICAgICBsYWJlbDogbnVsbFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwZWVrTGluZVRlcm1pbmF0b3IoKSkge1xuICAgICAgICAgICAgaWYgKCFzdGF0ZS5pbkl0ZXJhdGlvbikge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLklsbGVnYWxDb250aW51ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkNvbnRpbnVlU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgIGxhYmVsOiBudWxsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgIGxhYmVsID0gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKTtcblxuICAgICAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc3RhdGUubGFiZWxTZXQsIGxhYmVsLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5rbm93bkxhYmVsLCBsYWJlbC5uYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICBpZiAobGFiZWwgPT09IG51bGwgJiYgIXN0YXRlLmluSXRlcmF0aW9uKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbGxlZ2FsQ29udGludWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Db250aW51ZVN0YXRlbWVudCxcbiAgICAgICAgICAgIGxhYmVsOiBsYWJlbFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjggVGhlIGJyZWFrIHN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VCcmVha1N0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIHRva2VuLCBsYWJlbCA9IG51bGw7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnYnJlYWsnKTtcblxuICAgICAgICAvLyBPcHRpbWl6ZSB0aGUgbW9zdCBjb21tb24gZm9ybTogJ2JyZWFrOycuXG4gICAgICAgIGlmIChzb3VyY2VbaW5kZXhdID09PSAnOycpIHtcbiAgICAgICAgICAgIGxleCgpO1xuXG4gICAgICAgICAgICBpZiAoIShzdGF0ZS5pbkl0ZXJhdGlvbiB8fCBzdGF0ZS5pblN3aXRjaCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbGxlZ2FsQnJlYWspO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CcmVha1N0YXRlbWVudCxcbiAgICAgICAgICAgICAgICBsYWJlbDogbnVsbFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwZWVrTGluZVRlcm1pbmF0b3IoKSkge1xuICAgICAgICAgICAgaWYgKCEoc3RhdGUuaW5JdGVyYXRpb24gfHwgc3RhdGUuaW5Td2l0Y2gpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSWxsZWdhbEJyZWFrKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQnJlYWtTdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgbGFiZWw6IG51bGxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uSWRlbnRpZmllcikge1xuICAgICAgICAgICAgbGFiZWwgPSBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcigpO1xuXG4gICAgICAgICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzdGF0ZS5sYWJlbFNldCwgbGFiZWwubmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5Vbmtub3duTGFiZWwsIGxhYmVsLm5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIGlmIChsYWJlbCA9PT0gbnVsbCAmJiAhKHN0YXRlLmluSXRlcmF0aW9uIHx8IHN0YXRlLmluU3dpdGNoKSkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSWxsZWdhbEJyZWFrKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguQnJlYWtTdGF0ZW1lbnQsXG4gICAgICAgICAgICBsYWJlbDogbGFiZWxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi45IFRoZSByZXR1cm4gc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZVJldHVyblN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIHRva2VuLCBhcmd1bWVudCA9IG51bGw7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgncmV0dXJuJyk7XG5cbiAgICAgICAgaWYgKCFzdGF0ZS5pbkZ1bmN0aW9uQm9keSkge1xuICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5JbGxlZ2FsUmV0dXJuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vICdyZXR1cm4nIGZvbGxvd2VkIGJ5IGEgc3BhY2UgYW5kIGFuIGlkZW50aWZpZXIgaXMgdmVyeSBjb21tb24uXG4gICAgICAgIGlmIChzb3VyY2VbaW5kZXhdID09PSAnICcpIHtcbiAgICAgICAgICAgIGlmIChpc0lkZW50aWZpZXJTdGFydChzb3VyY2VbaW5kZXggKyAxXSkpIHtcbiAgICAgICAgICAgICAgICBhcmd1bWVudCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguUmV0dXJuU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgICAgICBhcmd1bWVudDogYXJndW1lbnRcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBlZWtMaW5lVGVybWluYXRvcigpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5SZXR1cm5TdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgYXJndW1lbnQ6IG51bGxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW1hdGNoKCc7JykpIHtcbiAgICAgICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgICAgICBpZiAoIW1hdGNoKCd9JykgJiYgdG9rZW4udHlwZSAhPT0gVG9rZW4uRU9GKSB7XG4gICAgICAgICAgICAgICAgYXJndW1lbnQgPSBwYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LlJldHVyblN0YXRlbWVudCxcbiAgICAgICAgICAgIGFyZ3VtZW50OiBhcmd1bWVudFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjEwIFRoZSB3aXRoIHN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VXaXRoU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgb2JqZWN0LCBib2R5O1xuXG4gICAgICAgIGlmIChzdHJpY3QpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuU3RyaWN0TW9kZVdpdGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnd2l0aCcpO1xuXG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIG9iamVjdCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIGJvZHkgPSBwYXJzZVN0YXRlbWVudCgpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguV2l0aFN0YXRlbWVudCxcbiAgICAgICAgICAgIG9iamVjdDogb2JqZWN0LFxuICAgICAgICAgICAgYm9keTogYm9keVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjEwIFRoZSBzd2l0aCBzdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlU3dpdGNoQ2FzZSgpIHtcbiAgICAgICAgdmFyIHRlc3QsXG4gICAgICAgICAgICBjb25zZXF1ZW50ID0gW10sXG4gICAgICAgICAgICBzdGF0ZW1lbnQ7XG5cbiAgICAgICAgaWYgKG1hdGNoS2V5d29yZCgnZGVmYXVsdCcpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIHRlc3QgPSBudWxsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXhwZWN0S2V5d29yZCgnY2FzZScpO1xuICAgICAgICAgICAgdGVzdCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICB9XG4gICAgICAgIGV4cGVjdCgnOicpO1xuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKG1hdGNoKCd9JykgfHwgbWF0Y2hLZXl3b3JkKCdkZWZhdWx0JykgfHwgbWF0Y2hLZXl3b3JkKCdjYXNlJykpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXRlbWVudCA9IHBhcnNlU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHN0YXRlbWVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnNlcXVlbnQucHVzaChzdGF0ZW1lbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Td2l0Y2hDYXNlLFxuICAgICAgICAgICAgdGVzdDogdGVzdCxcbiAgICAgICAgICAgIGNvbnNlcXVlbnQ6IGNvbnNlcXVlbnRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZVN3aXRjaFN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIGRpc2NyaW1pbmFudCwgY2FzZXMsIGNsYXVzZSwgb2xkSW5Td2l0Y2gsIGRlZmF1bHRGb3VuZDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdzd2l0Y2gnKTtcblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICBkaXNjcmltaW5hbnQgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBleHBlY3QoJ3snKTtcblxuICAgICAgICBpZiAobWF0Y2goJ30nKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Td2l0Y2hTdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgZGlzY3JpbWluYW50OiBkaXNjcmltaW5hbnRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBjYXNlcyA9IFtdO1xuXG4gICAgICAgIG9sZEluU3dpdGNoID0gc3RhdGUuaW5Td2l0Y2g7XG4gICAgICAgIHN0YXRlLmluU3dpdGNoID0gdHJ1ZTtcbiAgICAgICAgZGVmYXVsdEZvdW5kID0gZmFsc2U7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJ30nKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2xhdXNlID0gcGFyc2VTd2l0Y2hDYXNlKCk7XG4gICAgICAgICAgICBpZiAoY2xhdXNlLnRlc3QgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVmYXVsdEZvdW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLk11bHRpcGxlRGVmYXVsdHNJblN3aXRjaCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRlZmF1bHRGb3VuZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlcy5wdXNoKGNsYXVzZSk7XG4gICAgICAgIH1cblxuICAgICAgICBzdGF0ZS5pblN3aXRjaCA9IG9sZEluU3dpdGNoO1xuXG4gICAgICAgIGV4cGVjdCgnfScpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguU3dpdGNoU3RhdGVtZW50LFxuICAgICAgICAgICAgZGlzY3JpbWluYW50OiBkaXNjcmltaW5hbnQsXG4gICAgICAgICAgICBjYXNlczogY2FzZXNcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi4xMyBUaGUgdGhyb3cgc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZVRocm93U3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgYXJndW1lbnQ7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgndGhyb3cnKTtcblxuICAgICAgICBpZiAocGVla0xpbmVUZXJtaW5hdG9yKCkpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLk5ld2xpbmVBZnRlclRocm93KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFyZ3VtZW50ID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguVGhyb3dTdGF0ZW1lbnQsXG4gICAgICAgICAgICBhcmd1bWVudDogYXJndW1lbnRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi4xNCBUaGUgdHJ5IHN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VDYXRjaENsYXVzZSgpIHtcbiAgICAgICAgdmFyIHBhcmFtO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ2NhdGNoJyk7XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG4gICAgICAgIGlmIChtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICB0aHJvd1VuZXhwZWN0ZWQobG9va2FoZWFkKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcGFyYW0gPSBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcigpO1xuICAgICAgICAvLyAxMi4xNC4xXG4gICAgICAgIGlmIChzdHJpY3QgJiYgaXNSZXN0cmljdGVkV29yZChwYXJhbS5uYW1lKSkge1xuICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5TdHJpY3RDYXRjaFZhcmlhYmxlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguQ2F0Y2hDbGF1c2UsXG4gICAgICAgICAgICBwYXJhbTogcGFyYW0sXG4gICAgICAgICAgICBib2R5OiBwYXJzZUJsb2NrKClcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZVRyeVN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIGJsb2NrLCBoYW5kbGVycyA9IFtdLCBmaW5hbGl6ZXIgPSBudWxsO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ3RyeScpO1xuXG4gICAgICAgIGJsb2NrID0gcGFyc2VCbG9jaygpO1xuXG4gICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ2NhdGNoJykpIHtcbiAgICAgICAgICAgIGhhbmRsZXJzLnB1c2gocGFyc2VDYXRjaENsYXVzZSgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ2ZpbmFsbHknKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICBmaW5hbGl6ZXIgPSBwYXJzZUJsb2NrKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaGFuZGxlcnMubGVuZ3RoID09PSAwICYmICFmaW5hbGl6ZXIpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLk5vQ2F0Y2hPckZpbmFsbHkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5UcnlTdGF0ZW1lbnQsXG4gICAgICAgICAgICBibG9jazogYmxvY2ssXG4gICAgICAgICAgICBndWFyZGVkSGFuZGxlcnM6IFtdLFxuICAgICAgICAgICAgaGFuZGxlcnM6IGhhbmRsZXJzLFxuICAgICAgICAgICAgZmluYWxpemVyOiBmaW5hbGl6ZXJcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi4xNSBUaGUgZGVidWdnZXIgc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZURlYnVnZ2VyU3RhdGVtZW50KCkge1xuICAgICAgICBleHBlY3RLZXl3b3JkKCdkZWJ1Z2dlcicpO1xuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkRlYnVnZ2VyU3RhdGVtZW50XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIgU3RhdGVtZW50c1xuXG4gICAgZnVuY3Rpb24gcGFyc2VTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxvb2thaGVhZCgpLFxuICAgICAgICAgICAgZXhwcixcbiAgICAgICAgICAgIGxhYmVsZWRCb2R5O1xuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5FT0YpIHtcbiAgICAgICAgICAgIHRocm93VW5leHBlY3RlZCh0b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uUHVuY3R1YXRvcikge1xuICAgICAgICAgICAgc3dpdGNoICh0b2tlbi52YWx1ZSkge1xuICAgICAgICAgICAgY2FzZSAnOyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRW1wdHlTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3snOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUJsb2NrKCk7XG4gICAgICAgICAgICBjYXNlICcoJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VFeHByZXNzaW9uU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLktleXdvcmQpIHtcbiAgICAgICAgICAgIHN3aXRjaCAodG9rZW4udmFsdWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2JyZWFrJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VCcmVha1N0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAnY29udGludWUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUNvbnRpbnVlU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICdkZWJ1Z2dlcic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRGVidWdnZXJTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ2RvJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VEb1doaWxlU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICdmb3InOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUZvclN0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAnZnVuY3Rpb24nOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb24oKTtcbiAgICAgICAgICAgIGNhc2UgJ2lmJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJZlN0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAncmV0dXJuJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VSZXR1cm5TdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3N3aXRjaCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlU3dpdGNoU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICd0aHJvdyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlVGhyb3dTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3RyeSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlVHJ5U3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICd2YXInOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZVZhcmlhYmxlU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICd3aGlsZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlV2hpbGVTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3dpdGgnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZVdpdGhTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHByID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgLy8gMTIuMTIgTGFiZWxsZWQgU3RhdGVtZW50c1xuICAgICAgICBpZiAoKGV4cHIudHlwZSA9PT0gU3ludGF4LklkZW50aWZpZXIpICYmIG1hdGNoKCc6JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuXG4gICAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHN0YXRlLmxhYmVsU2V0LCBleHByLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuUmVkZWNsYXJhdGlvbiwgJ0xhYmVsJywgZXhwci5uYW1lKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3RhdGUubGFiZWxTZXRbZXhwci5uYW1lXSA9IHRydWU7XG4gICAgICAgICAgICBsYWJlbGVkQm9keSA9IHBhcnNlU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBkZWxldGUgc3RhdGUubGFiZWxTZXRbZXhwci5uYW1lXTtcblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTGFiZWxlZFN0YXRlbWVudCxcbiAgICAgICAgICAgICAgICBsYWJlbDogZXhwcixcbiAgICAgICAgICAgICAgICBib2R5OiBsYWJlbGVkQm9keVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkV4cHJlc3Npb25TdGF0ZW1lbnQsXG4gICAgICAgICAgICBleHByZXNzaW9uOiBleHByXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTMgRnVuY3Rpb24gRGVmaW5pdGlvblxuXG4gICAgZnVuY3Rpb24gcGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzKCkge1xuICAgICAgICB2YXIgc291cmNlRWxlbWVudCwgc291cmNlRWxlbWVudHMgPSBbXSwgdG9rZW4sIGRpcmVjdGl2ZSwgZmlyc3RSZXN0cmljdGVkLFxuICAgICAgICAgICAgb2xkTGFiZWxTZXQsIG9sZEluSXRlcmF0aW9uLCBvbGRJblN3aXRjaCwgb2xkSW5GdW5jdGlvbkJvZHk7XG5cbiAgICAgICAgZXhwZWN0KCd7Jyk7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc291cmNlRWxlbWVudCA9IHBhcnNlU291cmNlRWxlbWVudCgpO1xuICAgICAgICAgICAgc291cmNlRWxlbWVudHMucHVzaChzb3VyY2VFbGVtZW50KTtcbiAgICAgICAgICAgIGlmIChzb3VyY2VFbGVtZW50LmV4cHJlc3Npb24udHlwZSAhPT0gU3ludGF4LkxpdGVyYWwpIHtcbiAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIG5vdCBkaXJlY3RpdmVcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRpcmVjdGl2ZSA9IHNsaWNlU291cmNlKHRva2VuLnJhbmdlWzBdICsgMSwgdG9rZW4ucmFuZ2VbMV0gLSAxKTtcbiAgICAgICAgICAgIGlmIChkaXJlY3RpdmUgPT09ICd1c2Ugc3RyaWN0Jykge1xuICAgICAgICAgICAgICAgIHN0cmljdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKGZpcnN0UmVzdHJpY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoZmlyc3RSZXN0cmljdGVkLCBNZXNzYWdlcy5TdHJpY3RPY3RhbExpdGVyYWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCFmaXJzdFJlc3RyaWN0ZWQgJiYgdG9rZW4ub2N0YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgb2xkTGFiZWxTZXQgPSBzdGF0ZS5sYWJlbFNldDtcbiAgICAgICAgb2xkSW5JdGVyYXRpb24gPSBzdGF0ZS5pbkl0ZXJhdGlvbjtcbiAgICAgICAgb2xkSW5Td2l0Y2ggPSBzdGF0ZS5pblN3aXRjaDtcbiAgICAgICAgb2xkSW5GdW5jdGlvbkJvZHkgPSBzdGF0ZS5pbkZ1bmN0aW9uQm9keTtcblxuICAgICAgICBzdGF0ZS5sYWJlbFNldCA9IHt9O1xuICAgICAgICBzdGF0ZS5pbkl0ZXJhdGlvbiA9IGZhbHNlO1xuICAgICAgICBzdGF0ZS5pblN3aXRjaCA9IGZhbHNlO1xuICAgICAgICBzdGF0ZS5pbkZ1bmN0aW9uQm9keSA9IHRydWU7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJ30nKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc291cmNlRWxlbWVudCA9IHBhcnNlU291cmNlRWxlbWVudCgpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzb3VyY2VFbGVtZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc291cmNlRWxlbWVudHMucHVzaChzb3VyY2VFbGVtZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnfScpO1xuXG4gICAgICAgIHN0YXRlLmxhYmVsU2V0ID0gb2xkTGFiZWxTZXQ7XG4gICAgICAgIHN0YXRlLmluSXRlcmF0aW9uID0gb2xkSW5JdGVyYXRpb247XG4gICAgICAgIHN0YXRlLmluU3dpdGNoID0gb2xkSW5Td2l0Y2g7XG4gICAgICAgIHN0YXRlLmluRnVuY3Rpb25Cb2R5ID0gb2xkSW5GdW5jdGlvbkJvZHk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CbG9ja1N0YXRlbWVudCxcbiAgICAgICAgICAgIGJvZHk6IHNvdXJjZUVsZW1lbnRzXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VGdW5jdGlvbkRlY2xhcmF0aW9uKCkge1xuICAgICAgICB2YXIgaWQsIHBhcmFtLCBwYXJhbXMgPSBbXSwgYm9keSwgdG9rZW4sIHN0cmljdGVkLCBmaXJzdFJlc3RyaWN0ZWQsIG1lc3NhZ2UsIHByZXZpb3VzU3RyaWN0LCBwYXJhbVNldDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdmdW5jdGlvbicpO1xuICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICBpZCA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCk7XG4gICAgICAgIGlmIChzdHJpY3QpIHtcbiAgICAgICAgICAgIGlmIChpc1Jlc3RyaWN0ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh0b2tlbiwgTWVzc2FnZXMuU3RyaWN0RnVuY3Rpb25OYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChpc1Jlc3RyaWN0ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RGdW5jdGlvbk5hbWU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzU3RyaWN0TW9kZVJlc2VydmVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UmVzZXJ2ZWRXb3JkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgaWYgKCFtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICBwYXJhbVNldCA9IHt9O1xuICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgICAgICAgICBwYXJhbSA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCk7XG4gICAgICAgICAgICAgICAgaWYgKHN0cmljdCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNSZXN0cmljdGVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UGFyYW1OYW1lO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocGFyYW1TZXQsIHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbUR1cGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFmaXJzdFJlc3RyaWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbU5hbWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpY3RNb2RlUmVzZXJ2ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UmVzZXJ2ZWRXb3JkO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChwYXJhbVNldCwgdG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbUR1cGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGFyYW1zLnB1c2gocGFyYW0pO1xuICAgICAgICAgICAgICAgIHBhcmFtU2V0W3BhcmFtLm5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2goJyknKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXhwZWN0KCcsJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBwcmV2aW91c1N0cmljdCA9IHN0cmljdDtcbiAgICAgICAgYm9keSA9IHBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cygpO1xuICAgICAgICBpZiAoc3RyaWN0ICYmIGZpcnN0UmVzdHJpY3RlZCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcihmaXJzdFJlc3RyaWN0ZWQsIG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdHJpY3QgJiYgc3RyaWN0ZWQpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudChzdHJpY3RlZCwgbWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgc3RyaWN0ID0gcHJldmlvdXNTdHJpY3Q7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5GdW5jdGlvbkRlY2xhcmF0aW9uLFxuICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgcGFyYW1zOiBwYXJhbXMsXG4gICAgICAgICAgICBkZWZhdWx0czogW10sXG4gICAgICAgICAgICBib2R5OiBib2R5LFxuICAgICAgICAgICAgcmVzdDogbnVsbCxcbiAgICAgICAgICAgIGdlbmVyYXRvcjogZmFsc2UsXG4gICAgICAgICAgICBleHByZXNzaW9uOiBmYWxzZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlRnVuY3Rpb25FeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgdG9rZW4sIGlkID0gbnVsbCwgc3RyaWN0ZWQsIGZpcnN0UmVzdHJpY3RlZCwgbWVzc2FnZSwgcGFyYW0sIHBhcmFtcyA9IFtdLCBib2R5LCBwcmV2aW91c1N0cmljdCwgcGFyYW1TZXQ7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnZnVuY3Rpb24nKTtcblxuICAgICAgICBpZiAoIW1hdGNoKCcoJykpIHtcbiAgICAgICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgICAgICBpZCA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCk7XG4gICAgICAgICAgICBpZiAoc3RyaWN0KSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh0b2tlbiwgTWVzc2FnZXMuU3RyaWN0RnVuY3Rpb25OYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChpc1Jlc3RyaWN0ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdEZ1bmN0aW9uTmFtZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzU3RyaWN0TW9kZVJlc2VydmVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RSZXNlcnZlZFdvcmQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgaWYgKCFtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICBwYXJhbVNldCA9IHt9O1xuICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgICAgICAgICBwYXJhbSA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCk7XG4gICAgICAgICAgICAgICAgaWYgKHN0cmljdCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNSZXN0cmljdGVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UGFyYW1OYW1lO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocGFyYW1TZXQsIHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbUR1cGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFmaXJzdFJlc3RyaWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbU5hbWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpY3RNb2RlUmVzZXJ2ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UmVzZXJ2ZWRXb3JkO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChwYXJhbVNldCwgdG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbUR1cGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGFyYW1zLnB1c2gocGFyYW0pO1xuICAgICAgICAgICAgICAgIHBhcmFtU2V0W3BhcmFtLm5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2goJyknKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXhwZWN0KCcsJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBwcmV2aW91c1N0cmljdCA9IHN0cmljdDtcbiAgICAgICAgYm9keSA9IHBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cygpO1xuICAgICAgICBpZiAoc3RyaWN0ICYmIGZpcnN0UmVzdHJpY3RlZCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcihmaXJzdFJlc3RyaWN0ZWQsIG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdHJpY3QgJiYgc3RyaWN0ZWQpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudChzdHJpY3RlZCwgbWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgc3RyaWN0ID0gcHJldmlvdXNTdHJpY3Q7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5GdW5jdGlvbkV4cHJlc3Npb24sXG4gICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICBwYXJhbXM6IHBhcmFtcyxcbiAgICAgICAgICAgIGRlZmF1bHRzOiBbXSxcbiAgICAgICAgICAgIGJvZHk6IGJvZHksXG4gICAgICAgICAgICByZXN0OiBudWxsLFxuICAgICAgICAgICAgZ2VuZXJhdG9yOiBmYWxzZSxcbiAgICAgICAgICAgIGV4cHJlc3Npb246IGZhbHNlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTQgUHJvZ3JhbVxuXG4gICAgZnVuY3Rpb24gcGFyc2VTb3VyY2VFbGVtZW50KCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsb29rYWhlYWQoKTtcblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uS2V5d29yZCkge1xuICAgICAgICAgICAgc3dpdGNoICh0b2tlbi52YWx1ZSkge1xuICAgICAgICAgICAgY2FzZSAnY29uc3QnOlxuICAgICAgICAgICAgY2FzZSAnbGV0JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VDb25zdExldERlY2xhcmF0aW9uKHRva2VuLnZhbHVlKTtcbiAgICAgICAgICAgIGNhc2UgJ2Z1bmN0aW9uJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VGdW5jdGlvbkRlY2xhcmF0aW9uKCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZVN0YXRlbWVudCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLkVPRikge1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlU3RhdGVtZW50KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZVNvdXJjZUVsZW1lbnRzKCkge1xuICAgICAgICB2YXIgc291cmNlRWxlbWVudCwgc291cmNlRWxlbWVudHMgPSBbXSwgdG9rZW4sIGRpcmVjdGl2ZSwgZmlyc3RSZXN0cmljdGVkO1xuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5TdHJpbmdMaXRlcmFsKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNvdXJjZUVsZW1lbnQgPSBwYXJzZVNvdXJjZUVsZW1lbnQoKTtcbiAgICAgICAgICAgIHNvdXJjZUVsZW1lbnRzLnB1c2goc291cmNlRWxlbWVudCk7XG4gICAgICAgICAgICBpZiAoc291cmNlRWxlbWVudC5leHByZXNzaW9uLnR5cGUgIT09IFN5bnRheC5MaXRlcmFsKSB7XG4gICAgICAgICAgICAgICAgLy8gdGhpcyBpcyBub3QgZGlyZWN0aXZlXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkaXJlY3RpdmUgPSBzbGljZVNvdXJjZSh0b2tlbi5yYW5nZVswXSArIDEsIHRva2VuLnJhbmdlWzFdIC0gMSk7XG4gICAgICAgICAgICBpZiAoZGlyZWN0aXZlID09PSAndXNlIHN0cmljdCcpIHtcbiAgICAgICAgICAgICAgICBzdHJpY3QgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChmaXJzdFJlc3RyaWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KGZpcnN0UmVzdHJpY3RlZCwgTWVzc2FnZXMuU3RyaWN0T2N0YWxMaXRlcmFsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghZmlyc3RSZXN0cmljdGVkICYmIHRva2VuLm9jdGFsKSB7XG4gICAgICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgc291cmNlRWxlbWVudCA9IHBhcnNlU291cmNlRWxlbWVudCgpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzb3VyY2VFbGVtZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc291cmNlRWxlbWVudHMucHVzaChzb3VyY2VFbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc291cmNlRWxlbWVudHM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VQcm9ncmFtKCkge1xuICAgICAgICB2YXIgcHJvZ3JhbTtcbiAgICAgICAgc3RyaWN0ID0gZmFsc2U7XG4gICAgICAgIHByb2dyYW0gPSB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguUHJvZ3JhbSxcbiAgICAgICAgICAgIGJvZHk6IHBhcnNlU291cmNlRWxlbWVudHMoKVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gcHJvZ3JhbTtcbiAgICB9XG5cbiAgICAvLyBUaGUgZm9sbG93aW5nIGZ1bmN0aW9ucyBhcmUgbmVlZGVkIG9ubHkgd2hlbiB0aGUgb3B0aW9uIHRvIHByZXNlcnZlXG4gICAgLy8gdGhlIGNvbW1lbnRzIGlzIGFjdGl2ZS5cblxuICAgIGZ1bmN0aW9uIGFkZENvbW1lbnQodHlwZSwgdmFsdWUsIHN0YXJ0LCBlbmQsIGxvYykge1xuICAgICAgICBhc3NlcnQodHlwZW9mIHN0YXJ0ID09PSAnbnVtYmVyJywgJ0NvbW1lbnQgbXVzdCBoYXZlIHZhbGlkIHBvc2l0aW9uJyk7XG5cbiAgICAgICAgLy8gQmVjYXVzZSB0aGUgd2F5IHRoZSBhY3R1YWwgdG9rZW4gaXMgc2Nhbm5lZCwgb2Z0ZW4gdGhlIGNvbW1lbnRzXG4gICAgICAgIC8vIChpZiBhbnkpIGFyZSBza2lwcGVkIHR3aWNlIGR1cmluZyB0aGUgbGV4aWNhbCBhbmFseXNpcy5cbiAgICAgICAgLy8gVGh1cywgd2UgbmVlZCB0byBza2lwIGFkZGluZyBhIGNvbW1lbnQgaWYgdGhlIGNvbW1lbnQgYXJyYXkgYWxyZWFkeVxuICAgICAgICAvLyBoYW5kbGVkIGl0LlxuICAgICAgICBpZiAoZXh0cmEuY29tbWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKGV4dHJhLmNvbW1lbnRzW2V4dHJhLmNvbW1lbnRzLmxlbmd0aCAtIDFdLnJhbmdlWzFdID4gc3RhcnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHRyYS5jb21tZW50cy5wdXNoKHtcbiAgICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBlbmRdLFxuICAgICAgICAgICAgbG9jOiBsb2NcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2NhbkNvbW1lbnQoKSB7XG4gICAgICAgIHZhciBjb21tZW50LCBjaCwgbG9jLCBzdGFydCwgYmxvY2tDb21tZW50LCBsaW5lQ29tbWVudDtcblxuICAgICAgICBjb21tZW50ID0gJyc7XG4gICAgICAgIGJsb2NrQ29tbWVudCA9IGZhbHNlO1xuICAgICAgICBsaW5lQ29tbWVudCA9IGZhbHNlO1xuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuXG4gICAgICAgICAgICBpZiAobGluZUNvbW1lbnQpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICBpZiAoaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jLmVuZCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0IC0gMVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBsaW5lQ29tbWVudCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBhZGRDb21tZW50KCdMaW5lJywgY29tbWVudCwgc3RhcnQsIGluZGV4IC0gMSwgbG9jKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAnXFxyJyAmJiBzb3VyY2VbaW5kZXhdID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICArK2xpbmVOdW1iZXI7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVTdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICBjb21tZW50ID0gJyc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgbGluZUNvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgY29tbWVudCArPSBjaDtcbiAgICAgICAgICAgICAgICAgICAgbG9jLmVuZCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IGxlbmd0aCAtIGxpbmVTdGFydFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBhZGRDb21tZW50KCdMaW5lJywgY29tbWVudCwgc3RhcnQsIGxlbmd0aCwgbG9jKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb21tZW50ICs9IGNoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYmxvY2tDb21tZW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ1xccicgJiYgc291cmNlW2luZGV4ICsgMV0gPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tbWVudCArPSAnXFxyXFxuJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgKz0gY2g7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKytsaW5lTnVtYmVyO1xuICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICBsaW5lU3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb21tZW50ICs9IGNoO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICcqJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21tZW50ID0gY29tbWVudC5zdWJzdHIoMCwgY29tbWVudC5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9ja0NvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvYy5lbmQgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZENvbW1lbnQoJ0Jsb2NrJywgY29tbWVudCwgc3RhcnQsIGluZGV4LCBsb2MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICcvJykge1xuICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4ICsgMV07XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggKz0gMjtcbiAgICAgICAgICAgICAgICAgICAgbGluZUNvbW1lbnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2MuZW5kID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVDb21tZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRDb21tZW50KCdMaW5lJywgY29tbWVudCwgc3RhcnQsIGluZGV4LCBsb2MpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJyonKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ICs9IDI7XG4gICAgICAgICAgICAgICAgICAgIGJsb2NrQ29tbWVudCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGxvYyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0IC0gMlxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzV2hpdGVTcGFjZShjaCkpIHtcbiAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAgJ1xccicgJiYgc291cmNlW2luZGV4XSA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKytsaW5lTnVtYmVyO1xuICAgICAgICAgICAgICAgIGxpbmVTdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZpbHRlckNvbW1lbnRMb2NhdGlvbigpIHtcbiAgICAgICAgdmFyIGksIGVudHJ5LCBjb21tZW50LCBjb21tZW50cyA9IFtdO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBleHRyYS5jb21tZW50cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgZW50cnkgPSBleHRyYS5jb21tZW50c1tpXTtcbiAgICAgICAgICAgIGNvbW1lbnQgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogZW50cnkudHlwZSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogZW50cnkudmFsdWVcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAoZXh0cmEucmFuZ2UpIHtcbiAgICAgICAgICAgICAgICBjb21tZW50LnJhbmdlID0gZW50cnkucmFuZ2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXh0cmEubG9jKSB7XG4gICAgICAgICAgICAgICAgY29tbWVudC5sb2MgPSBlbnRyeS5sb2M7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb21tZW50cy5wdXNoKGNvbW1lbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXh0cmEuY29tbWVudHMgPSBjb21tZW50cztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb2xsZWN0VG9rZW4oKSB7XG4gICAgICAgIHZhciBzdGFydCwgbG9jLCB0b2tlbiwgcmFuZ2UsIHZhbHVlO1xuXG4gICAgICAgIHNraXBDb21tZW50KCk7XG4gICAgICAgIHN0YXJ0ID0gaW5kZXg7XG4gICAgICAgIGxvYyA9IHtcbiAgICAgICAgICAgIHN0YXJ0OiB7XG4gICAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdG9rZW4gPSBleHRyYS5hZHZhbmNlKCk7XG4gICAgICAgIGxvYy5lbmQgPSB7XG4gICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5FT0YpIHtcbiAgICAgICAgICAgIHJhbmdlID0gW3Rva2VuLnJhbmdlWzBdLCB0b2tlbi5yYW5nZVsxXV07XG4gICAgICAgICAgICB2YWx1ZSA9IHNsaWNlU291cmNlKHRva2VuLnJhbmdlWzBdLCB0b2tlbi5yYW5nZVsxXSk7XG4gICAgICAgICAgICBleHRyYS50b2tlbnMucHVzaCh7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5OYW1lW3Rva2VuLnR5cGVdLFxuICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgICAgICByYW5nZTogcmFuZ2UsXG4gICAgICAgICAgICAgICAgbG9jOiBsb2NcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbGxlY3RSZWdleCgpIHtcbiAgICAgICAgdmFyIHBvcywgbG9jLCByZWdleCwgdG9rZW47XG5cbiAgICAgICAgc2tpcENvbW1lbnQoKTtcblxuICAgICAgICBwb3MgPSBpbmRleDtcbiAgICAgICAgbG9jID0ge1xuICAgICAgICAgICAgc3RhcnQ6IHtcbiAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICByZWdleCA9IGV4dHJhLnNjYW5SZWdFeHAoKTtcbiAgICAgICAgbG9jLmVuZCA9IHtcbiAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUG9wIHRoZSBwcmV2aW91cyB0b2tlbiwgd2hpY2ggaXMgbGlrZWx5ICcvJyBvciAnLz0nXG4gICAgICAgIGlmIChleHRyYS50b2tlbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdG9rZW4gPSBleHRyYS50b2tlbnNbZXh0cmEudG9rZW5zLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgaWYgKHRva2VuLnJhbmdlWzBdID09PSBwb3MgJiYgdG9rZW4udHlwZSA9PT0gJ1B1bmN0dWF0b3InKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRva2VuLnZhbHVlID09PSAnLycgfHwgdG9rZW4udmFsdWUgPT09ICcvPScpIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0cmEudG9rZW5zLnBvcCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4dHJhLnRva2Vucy5wdXNoKHtcbiAgICAgICAgICAgIHR5cGU6ICdSZWd1bGFyRXhwcmVzc2lvbicsXG4gICAgICAgICAgICB2YWx1ZTogcmVnZXgubGl0ZXJhbCxcbiAgICAgICAgICAgIHJhbmdlOiBbcG9zLCBpbmRleF0sXG4gICAgICAgICAgICBsb2M6IGxvY1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcmVnZXg7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZmlsdGVyVG9rZW5Mb2NhdGlvbigpIHtcbiAgICAgICAgdmFyIGksIGVudHJ5LCB0b2tlbiwgdG9rZW5zID0gW107XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGV4dHJhLnRva2Vucy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgZW50cnkgPSBleHRyYS50b2tlbnNbaV07XG4gICAgICAgICAgICB0b2tlbiA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBlbnRyeS50eXBlLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBlbnRyeS52YWx1ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmIChleHRyYS5yYW5nZSkge1xuICAgICAgICAgICAgICAgIHRva2VuLnJhbmdlID0gZW50cnkucmFuZ2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXh0cmEubG9jKSB7XG4gICAgICAgICAgICAgICAgdG9rZW4ubG9jID0gZW50cnkubG9jO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdG9rZW5zLnB1c2godG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgZXh0cmEudG9rZW5zID0gdG9rZW5zO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUxpdGVyYWwodG9rZW4pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5MaXRlcmFsLFxuICAgICAgICAgICAgdmFsdWU6IHRva2VuLnZhbHVlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlUmF3TGl0ZXJhbCh0b2tlbikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkxpdGVyYWwsXG4gICAgICAgICAgICB2YWx1ZTogdG9rZW4udmFsdWUsXG4gICAgICAgICAgICByYXc6IHNsaWNlU291cmNlKHRva2VuLnJhbmdlWzBdLCB0b2tlbi5yYW5nZVsxXSlcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVMb2NhdGlvbk1hcmtlcigpIHtcbiAgICAgICAgdmFyIG1hcmtlciA9IHt9O1xuXG4gICAgICAgIG1hcmtlci5yYW5nZSA9IFtpbmRleCwgaW5kZXhdO1xuICAgICAgICBtYXJrZXIubG9jID0ge1xuICAgICAgICAgICAgc3RhcnQ6IHtcbiAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlbmQ6IHtcbiAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBtYXJrZXIuZW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5yYW5nZVsxXSA9IGluZGV4O1xuICAgICAgICAgICAgdGhpcy5sb2MuZW5kLmxpbmUgPSBsaW5lTnVtYmVyO1xuICAgICAgICAgICAgdGhpcy5sb2MuZW5kLmNvbHVtbiA9IGluZGV4IC0gbGluZVN0YXJ0O1xuICAgICAgICB9O1xuXG4gICAgICAgIG1hcmtlci5hcHBseUdyb3VwID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIGlmIChleHRyYS5yYW5nZSkge1xuICAgICAgICAgICAgICAgIG5vZGUuZ3JvdXBSYW5nZSA9IFt0aGlzLnJhbmdlWzBdLCB0aGlzLnJhbmdlWzFdXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChleHRyYS5sb2MpIHtcbiAgICAgICAgICAgICAgICBub2RlLmdyb3VwTG9jID0ge1xuICAgICAgICAgICAgICAgICAgICBzdGFydDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogdGhpcy5sb2Muc3RhcnQubGluZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogdGhpcy5sb2Muc3RhcnQuY29sdW1uXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGVuZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogdGhpcy5sb2MuZW5kLmxpbmUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IHRoaXMubG9jLmVuZC5jb2x1bW5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgbWFya2VyLmFwcGx5ID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIGlmIChleHRyYS5yYW5nZSkge1xuICAgICAgICAgICAgICAgIG5vZGUucmFuZ2UgPSBbdGhpcy5yYW5nZVswXSwgdGhpcy5yYW5nZVsxXV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXh0cmEubG9jKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5sb2MgPSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiB0aGlzLmxvYy5zdGFydC5saW5lLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiB0aGlzLmxvYy5zdGFydC5jb2x1bW5cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZW5kOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiB0aGlzLmxvYy5lbmQubGluZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogdGhpcy5sb2MuZW5kLmNvbHVtblxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gbWFya2VyO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyYWNrR3JvdXBFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgbWFya2VyLCBleHByO1xuXG4gICAgICAgIHNraXBDb21tZW50KCk7XG4gICAgICAgIG1hcmtlciA9IGNyZWF0ZUxvY2F0aW9uTWFya2VyKCk7XG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIGV4cHIgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBtYXJrZXIuZW5kKCk7XG4gICAgICAgIG1hcmtlci5hcHBseUdyb3VwKGV4cHIpO1xuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyYWNrTGVmdEhhbmRTaWRlRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIG1hcmtlciwgZXhwcjtcblxuICAgICAgICBza2lwQ29tbWVudCgpO1xuICAgICAgICBtYXJrZXIgPSBjcmVhdGVMb2NhdGlvbk1hcmtlcigpO1xuXG4gICAgICAgIGV4cHIgPSBtYXRjaEtleXdvcmQoJ25ldycpID8gcGFyc2VOZXdFeHByZXNzaW9uKCkgOiBwYXJzZVByaW1hcnlFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCcuJykgfHwgbWF0Y2goJ1snKSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoKCdbJykpIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgY29tcHV0ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdDogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHBhcnNlQ29tcHV0ZWRNZW1iZXIoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgbWFya2VyLmVuZCgpO1xuICAgICAgICAgICAgICAgIG1hcmtlci5hcHBseShleHByKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNvbXB1dGVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiBleHByLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogcGFyc2VOb25Db21wdXRlZE1lbWJlcigpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuZW5kKCk7XG4gICAgICAgICAgICAgICAgbWFya2VyLmFwcGx5KGV4cHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHJhY2tMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsKCkge1xuICAgICAgICB2YXIgbWFya2VyLCBleHByO1xuXG4gICAgICAgIHNraXBDb21tZW50KCk7XG4gICAgICAgIG1hcmtlciA9IGNyZWF0ZUxvY2F0aW9uTWFya2VyKCk7XG5cbiAgICAgICAgZXhwciA9IG1hdGNoS2V5d29yZCgnbmV3JykgPyBwYXJzZU5ld0V4cHJlc3Npb24oKSA6IHBhcnNlUHJpbWFyeUV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJy4nKSB8fCBtYXRjaCgnWycpIHx8IG1hdGNoKCcoJykpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaCgnKCcpKSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkNhbGxFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjYWxsZWU6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgICdhcmd1bWVudHMnOiBwYXJzZUFyZ3VtZW50cygpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuZW5kKCk7XG4gICAgICAgICAgICAgICAgbWFya2VyLmFwcGx5KGV4cHIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtYXRjaCgnWycpKSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNvbXB1dGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwYXJzZUNvbXB1dGVkTWVtYmVyKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIG1hcmtlci5lbmQoKTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuYXBwbHkoZXhwcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjb21wdXRlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdDogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHBhcnNlTm9uQ29tcHV0ZWRNZW1iZXIoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgbWFya2VyLmVuZCgpO1xuICAgICAgICAgICAgICAgIG1hcmtlci5hcHBseShleHByKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZpbHRlckdyb3VwKG5vZGUpIHtcbiAgICAgICAgdmFyIG4sIGksIGVudHJ5O1xuXG4gICAgICAgIG4gPSAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5hcHBseShub2RlKSA9PT0gJ1tvYmplY3QgQXJyYXldJykgPyBbXSA6IHt9O1xuICAgICAgICBmb3IgKGkgaW4gbm9kZSkge1xuICAgICAgICAgICAgaWYgKG5vZGUuaGFzT3duUHJvcGVydHkoaSkgJiYgaSAhPT0gJ2dyb3VwUmFuZ2UnICYmIGkgIT09ICdncm91cExvYycpIHtcbiAgICAgICAgICAgICAgICBlbnRyeSA9IG5vZGVbaV07XG4gICAgICAgICAgICAgICAgaWYgKGVudHJ5ID09PSBudWxsIHx8IHR5cGVvZiBlbnRyeSAhPT0gJ29iamVjdCcgfHwgZW50cnkgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgICAgICAgICAgICAgICAgbltpXSA9IGVudHJ5O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG5baV0gPSBmaWx0ZXJHcm91cChlbnRyeSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHdyYXBUcmFja2luZ0Z1bmN0aW9uKHJhbmdlLCBsb2MpIHtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHBhcnNlRnVuY3Rpb24pIHtcblxuICAgICAgICAgICAgZnVuY3Rpb24gaXNCaW5hcnkobm9kZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBub2RlLnR5cGUgPT09IFN5bnRheC5Mb2dpY2FsRXhwcmVzc2lvbiB8fFxuICAgICAgICAgICAgICAgICAgICBub2RlLnR5cGUgPT09IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiB2aXNpdChub2RlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN0YXJ0LCBlbmQ7XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNCaW5hcnkobm9kZS5sZWZ0KSkge1xuICAgICAgICAgICAgICAgICAgICB2aXNpdChub2RlLmxlZnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaXNCaW5hcnkobm9kZS5yaWdodCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmlzaXQobm9kZS5yaWdodCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHJhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmxlZnQuZ3JvdXBSYW5nZSB8fCBub2RlLnJpZ2h0Lmdyb3VwUmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gbm9kZS5sZWZ0Lmdyb3VwUmFuZ2UgPyBub2RlLmxlZnQuZ3JvdXBSYW5nZVswXSA6IG5vZGUubGVmdC5yYW5nZVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuZCA9IG5vZGUucmlnaHQuZ3JvdXBSYW5nZSA/IG5vZGUucmlnaHQuZ3JvdXBSYW5nZVsxXSA6IG5vZGUucmlnaHQucmFuZ2VbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLnJhbmdlID0gW3N0YXJ0LCBlbmRdO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBub2RlLnJhbmdlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBub2RlLmxlZnQucmFuZ2VbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICBlbmQgPSBub2RlLnJpZ2h0LnJhbmdlWzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5yYW5nZSA9IFtzdGFydCwgZW5kXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobG9jKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmxlZnQuZ3JvdXBMb2MgfHwgbm9kZS5yaWdodC5ncm91cExvYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBub2RlLmxlZnQuZ3JvdXBMb2MgPyBub2RlLmxlZnQuZ3JvdXBMb2Muc3RhcnQgOiBub2RlLmxlZnQubG9jLnN0YXJ0O1xuICAgICAgICAgICAgICAgICAgICAgICAgZW5kID0gbm9kZS5yaWdodC5ncm91cExvYyA/IG5vZGUucmlnaHQuZ3JvdXBMb2MuZW5kIDogbm9kZS5yaWdodC5sb2MuZW5kO1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5sb2MgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZDogZW5kXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBub2RlLmxvYyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUubG9jID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBub2RlLmxlZnQubG9jLnN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZDogbm9kZS5yaWdodC5sb2MuZW5kXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBtYXJrZXIsIG5vZGU7XG5cbiAgICAgICAgICAgICAgICBza2lwQ29tbWVudCgpO1xuXG4gICAgICAgICAgICAgICAgbWFya2VyID0gY3JlYXRlTG9jYXRpb25NYXJrZXIoKTtcbiAgICAgICAgICAgICAgICBub2RlID0gcGFyc2VGdW5jdGlvbi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIG1hcmtlci5lbmQoKTtcblxuICAgICAgICAgICAgICAgIGlmIChyYW5nZSAmJiB0eXBlb2Ygbm9kZS5yYW5nZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFya2VyLmFwcGx5KG5vZGUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChsb2MgJiYgdHlwZW9mIG5vZGUubG9jID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBtYXJrZXIuYXBwbHkobm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGlzQmluYXJ5KG5vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2l0KG5vZGUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBub2RlO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXRjaCgpIHtcblxuICAgICAgICB2YXIgd3JhcFRyYWNraW5nO1xuXG4gICAgICAgIGlmIChleHRyYS5jb21tZW50cykge1xuICAgICAgICAgICAgZXh0cmEuc2tpcENvbW1lbnQgPSBza2lwQ29tbWVudDtcbiAgICAgICAgICAgIHNraXBDb21tZW50ID0gc2NhbkNvbW1lbnQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZXh0cmEucmF3KSB7XG4gICAgICAgICAgICBleHRyYS5jcmVhdGVMaXRlcmFsID0gY3JlYXRlTGl0ZXJhbDtcbiAgICAgICAgICAgIGNyZWF0ZUxpdGVyYWwgPSBjcmVhdGVSYXdMaXRlcmFsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGV4dHJhLnJhbmdlIHx8IGV4dHJhLmxvYykge1xuXG4gICAgICAgICAgICBleHRyYS5wYXJzZUdyb3VwRXhwcmVzc2lvbiA9IHBhcnNlR3JvdXBFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uID0gcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsID0gcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsO1xuICAgICAgICAgICAgcGFyc2VHcm91cEV4cHJlc3Npb24gPSB0cmFja0dyb3VwRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbiA9IHRyYWNrTGVmdEhhbmRTaWRlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbkFsbG93Q2FsbCA9IHRyYWNrTGVmdEhhbmRTaWRlRXhwcmVzc2lvbkFsbG93Q2FsbDtcblxuICAgICAgICAgICAgd3JhcFRyYWNraW5nID0gd3JhcFRyYWNraW5nRnVuY3Rpb24oZXh0cmEucmFuZ2UsIGV4dHJhLmxvYyk7XG5cbiAgICAgICAgICAgIGV4dHJhLnBhcnNlQWRkaXRpdmVFeHByZXNzaW9uID0gcGFyc2VBZGRpdGl2ZUV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uID0gcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlQml0d2lzZUFOREV4cHJlc3Npb24gPSBwYXJzZUJpdHdpc2VBTkRFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uID0gcGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbiA9IHBhcnNlQml0d2lzZVhPUkV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUJsb2NrID0gcGFyc2VCbG9jaztcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cyA9IHBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cztcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlQ2F0Y2hDbGF1c2UgPSBwYXJzZUNhdGNoQ2xhdXNlO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VDb21wdXRlZE1lbWJlciA9IHBhcnNlQ29tcHV0ZWRNZW1iZXI7XG4gICAgICAgICAgICBleHRyYS5wYXJzZUNvbmRpdGlvbmFsRXhwcmVzc2lvbiA9IHBhcnNlQ29uZGl0aW9uYWxFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VDb25zdExldERlY2xhcmF0aW9uID0gcGFyc2VDb25zdExldERlY2xhcmF0aW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VFcXVhbGl0eUV4cHJlc3Npb24gPSBwYXJzZUVxdWFsaXR5RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlRXhwcmVzc2lvbiA9IHBhcnNlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlRm9yVmFyaWFibGVEZWNsYXJhdGlvbiA9IHBhcnNlRm9yVmFyaWFibGVEZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbiA9IHBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlRnVuY3Rpb25FeHByZXNzaW9uID0gcGFyc2VGdW5jdGlvbkV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUxvZ2ljYWxBTkRFeHByZXNzaW9uID0gcGFyc2VMb2dpY2FsQU5ERXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlTG9naWNhbE9SRXhwcmVzc2lvbiA9IHBhcnNlTG9naWNhbE9SRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlTXVsdGlwbGljYXRpdmVFeHByZXNzaW9uID0gcGFyc2VNdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZU5ld0V4cHJlc3Npb24gPSBwYXJzZU5ld0V4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZU5vbkNvbXB1dGVkUHJvcGVydHkgPSBwYXJzZU5vbkNvbXB1dGVkUHJvcGVydHk7XG4gICAgICAgICAgICBleHRyYS5wYXJzZU9iamVjdFByb3BlcnR5ID0gcGFyc2VPYmplY3RQcm9wZXJ0eTtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlT2JqZWN0UHJvcGVydHlLZXkgPSBwYXJzZU9iamVjdFByb3BlcnR5S2V5O1xuICAgICAgICAgICAgZXh0cmEucGFyc2VQb3N0Zml4RXhwcmVzc2lvbiA9IHBhcnNlUG9zdGZpeEV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZVByaW1hcnlFeHByZXNzaW9uID0gcGFyc2VQcmltYXJ5RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlUHJvZ3JhbSA9IHBhcnNlUHJvZ3JhbTtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlUHJvcGVydHlGdW5jdGlvbiA9IHBhcnNlUHJvcGVydHlGdW5jdGlvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb24gPSBwYXJzZVJlbGF0aW9uYWxFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VTdGF0ZW1lbnQgPSBwYXJzZVN0YXRlbWVudDtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlU2hpZnRFeHByZXNzaW9uID0gcGFyc2VTaGlmdEV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZVN3aXRjaENhc2UgPSBwYXJzZVN3aXRjaENhc2U7XG4gICAgICAgICAgICBleHRyYS5wYXJzZVVuYXJ5RXhwcmVzc2lvbiA9IHBhcnNlVW5hcnlFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uID0gcGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VWYXJpYWJsZUlkZW50aWZpZXIgPSBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcjtcblxuICAgICAgICAgICAgcGFyc2VBZGRpdGl2ZUV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VBZGRpdGl2ZUV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlQml0d2lzZUFOREV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VCaXR3aXNlQU5ERXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUJpdHdpc2VPUkV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlQml0d2lzZVhPUkV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUJsb2NrID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlQmxvY2spO1xuICAgICAgICAgICAgcGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cyk7XG4gICAgICAgICAgICBwYXJzZUNhdGNoQ2xhdXNlID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlQ2F0Y2hDbGF1c2UpO1xuICAgICAgICAgICAgcGFyc2VDb21wdXRlZE1lbWJlciA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUNvbXB1dGVkTWVtYmVyKTtcbiAgICAgICAgICAgIHBhcnNlQ29uZGl0aW9uYWxFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlQ29uZGl0aW9uYWxFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlQ29uc3RMZXREZWNsYXJhdGlvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUNvbnN0TGV0RGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgcGFyc2VFcXVhbGl0eUV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VFcXVhbGl0eUV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUZvclZhcmlhYmxlRGVjbGFyYXRpb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VGb3JWYXJpYWJsZURlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgIHBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgcGFyc2VGdW5jdGlvbkV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VGdW5jdGlvbkV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUxvZ2ljYWxBTkRFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlTG9naWNhbEFOREV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VMb2dpY2FsT1JFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlTG9naWNhbE9SRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZU5ld0V4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VOZXdFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eSA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZU5vbkNvbXB1dGVkUHJvcGVydHkpO1xuICAgICAgICAgICAgcGFyc2VPYmplY3RQcm9wZXJ0eSA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZU9iamVjdFByb3BlcnR5KTtcbiAgICAgICAgICAgIHBhcnNlT2JqZWN0UHJvcGVydHlLZXkgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VPYmplY3RQcm9wZXJ0eUtleSk7XG4gICAgICAgICAgICBwYXJzZVBvc3RmaXhFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlUG9zdGZpeEV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VQcmltYXJ5RXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVByaW1hcnlFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlUHJvZ3JhbSA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVByb2dyYW0pO1xuICAgICAgICAgICAgcGFyc2VQcm9wZXJ0eUZ1bmN0aW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlUHJvcGVydHlGdW5jdGlvbik7XG4gICAgICAgICAgICBwYXJzZVJlbGF0aW9uYWxFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VTdGF0ZW1lbnQgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VTdGF0ZW1lbnQpO1xuICAgICAgICAgICAgcGFyc2VTaGlmdEV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VTaGlmdEV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VTd2l0Y2hDYXNlID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlU3dpdGNoQ2FzZSk7XG4gICAgICAgICAgICBwYXJzZVVuYXJ5RXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVVuYXJ5RXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgIHBhcnNlVmFyaWFibGVJZGVudGlmaWVyID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlVmFyaWFibGVJZGVudGlmaWVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgZXh0cmEudG9rZW5zICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgZXh0cmEuYWR2YW5jZSA9IGFkdmFuY2U7XG4gICAgICAgICAgICBleHRyYS5zY2FuUmVnRXhwID0gc2NhblJlZ0V4cDtcblxuICAgICAgICAgICAgYWR2YW5jZSA9IGNvbGxlY3RUb2tlbjtcbiAgICAgICAgICAgIHNjYW5SZWdFeHAgPSBjb2xsZWN0UmVnZXg7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1bnBhdGNoKCkge1xuICAgICAgICBpZiAodHlwZW9mIGV4dHJhLnNraXBDb21tZW50ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBza2lwQ29tbWVudCA9IGV4dHJhLnNraXBDb21tZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGV4dHJhLnJhdykge1xuICAgICAgICAgICAgY3JlYXRlTGl0ZXJhbCA9IGV4dHJhLmNyZWF0ZUxpdGVyYWw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZXh0cmEucmFuZ2UgfHwgZXh0cmEubG9jKSB7XG4gICAgICAgICAgICBwYXJzZUFkZGl0aXZlRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlQWRkaXRpdmVFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlQXNzaWdubWVudEV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUJpdHdpc2VBTkRFeHByZXNzaW9uID0gZXh0cmEucGFyc2VCaXR3aXNlQU5ERXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlQml0d2lzZU9SRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlQml0d2lzZU9SRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlQml0d2lzZVhPUkV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUJpdHdpc2VYT1JFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VCbG9jayA9IGV4dHJhLnBhcnNlQmxvY2s7XG4gICAgICAgICAgICBwYXJzZUZ1bmN0aW9uU291cmNlRWxlbWVudHMgPSBleHRyYS5wYXJzZUZ1bmN0aW9uU291cmNlRWxlbWVudHM7XG4gICAgICAgICAgICBwYXJzZUNhdGNoQ2xhdXNlID0gZXh0cmEucGFyc2VDYXRjaENsYXVzZTtcbiAgICAgICAgICAgIHBhcnNlQ29tcHV0ZWRNZW1iZXIgPSBleHRyYS5wYXJzZUNvbXB1dGVkTWVtYmVyO1xuICAgICAgICAgICAgcGFyc2VDb25kaXRpb25hbEV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUNvbmRpdGlvbmFsRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlQ29uc3RMZXREZWNsYXJhdGlvbiA9IGV4dHJhLnBhcnNlQ29uc3RMZXREZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIHBhcnNlRXF1YWxpdHlFeHByZXNzaW9uID0gZXh0cmEucGFyc2VFcXVhbGl0eUV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUZvclZhcmlhYmxlRGVjbGFyYXRpb24gPSBleHRyYS5wYXJzZUZvclZhcmlhYmxlRGVjbGFyYXRpb247XG4gICAgICAgICAgICBwYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb24gPSBleHRyYS5wYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb247XG4gICAgICAgICAgICBwYXJzZUZ1bmN0aW9uRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlRnVuY3Rpb25FeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VHcm91cEV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUdyb3VwRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbkFsbG93Q2FsbCA9IGV4dHJhLnBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbkFsbG93Q2FsbDtcbiAgICAgICAgICAgIHBhcnNlTG9naWNhbEFOREV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUxvZ2ljYWxBTkRFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VMb2dpY2FsT1JFeHByZXNzaW9uID0gZXh0cmEucGFyc2VMb2dpY2FsT1JFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VNdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb24gPSBleHRyYS5wYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTmV3RXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlTmV3RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eSA9IGV4dHJhLnBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eTtcbiAgICAgICAgICAgIHBhcnNlT2JqZWN0UHJvcGVydHkgPSBleHRyYS5wYXJzZU9iamVjdFByb3BlcnR5O1xuICAgICAgICAgICAgcGFyc2VPYmplY3RQcm9wZXJ0eUtleSA9IGV4dHJhLnBhcnNlT2JqZWN0UHJvcGVydHlLZXk7XG4gICAgICAgICAgICBwYXJzZVByaW1hcnlFeHByZXNzaW9uID0gZXh0cmEucGFyc2VQcmltYXJ5RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlUG9zdGZpeEV4cHJlc3Npb24gPSBleHRyYS5wYXJzZVBvc3RmaXhFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VQcm9ncmFtID0gZXh0cmEucGFyc2VQcm9ncmFtO1xuICAgICAgICAgICAgcGFyc2VQcm9wZXJ0eUZ1bmN0aW9uID0gZXh0cmEucGFyc2VQcm9wZXJ0eUZ1bmN0aW9uO1xuICAgICAgICAgICAgcGFyc2VSZWxhdGlvbmFsRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZVN0YXRlbWVudCA9IGV4dHJhLnBhcnNlU3RhdGVtZW50O1xuICAgICAgICAgICAgcGFyc2VTaGlmdEV4cHJlc3Npb24gPSBleHRyYS5wYXJzZVNoaWZ0RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlU3dpdGNoQ2FzZSA9IGV4dHJhLnBhcnNlU3dpdGNoQ2FzZTtcbiAgICAgICAgICAgIHBhcnNlVW5hcnlFeHByZXNzaW9uID0gZXh0cmEucGFyc2VVbmFyeUV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb24gPSBleHRyYS5wYXJzZVZhcmlhYmxlRGVjbGFyYXRpb247XG4gICAgICAgICAgICBwYXJzZVZhcmlhYmxlSWRlbnRpZmllciA9IGV4dHJhLnBhcnNlVmFyaWFibGVJZGVudGlmaWVyO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBleHRyYS5zY2FuUmVnRXhwID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBhZHZhbmNlID0gZXh0cmEuYWR2YW5jZTtcbiAgICAgICAgICAgIHNjYW5SZWdFeHAgPSBleHRyYS5zY2FuUmVnRXhwO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3RyaW5nVG9BcnJheShzdHIpIHtcbiAgICAgICAgdmFyIGxlbmd0aCA9IHN0ci5sZW5ndGgsXG4gICAgICAgICAgICByZXN1bHQgPSBbXSxcbiAgICAgICAgICAgIGk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgcmVzdWx0W2ldID0gc3RyLmNoYXJBdChpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlKGNvZGUsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHByb2dyYW0sIHRvU3RyaW5nO1xuXG4gICAgICAgIHRvU3RyaW5nID0gU3RyaW5nO1xuICAgICAgICBpZiAodHlwZW9mIGNvZGUgIT09ICdzdHJpbmcnICYmICEoY29kZSBpbnN0YW5jZW9mIFN0cmluZykpIHtcbiAgICAgICAgICAgIGNvZGUgPSB0b1N0cmluZyhjb2RlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNvdXJjZSA9IGNvZGU7XG4gICAgICAgIGluZGV4ID0gMDtcbiAgICAgICAgbGluZU51bWJlciA9IChzb3VyY2UubGVuZ3RoID4gMCkgPyAxIDogMDtcbiAgICAgICAgbGluZVN0YXJ0ID0gMDtcbiAgICAgICAgbGVuZ3RoID0gc291cmNlLmxlbmd0aDtcbiAgICAgICAgYnVmZmVyID0gbnVsbDtcbiAgICAgICAgc3RhdGUgPSB7XG4gICAgICAgICAgICBhbGxvd0luOiB0cnVlLFxuICAgICAgICAgICAgbGFiZWxTZXQ6IHt9LFxuICAgICAgICAgICAgaW5GdW5jdGlvbkJvZHk6IGZhbHNlLFxuICAgICAgICAgICAgaW5JdGVyYXRpb246IGZhbHNlLFxuICAgICAgICAgICAgaW5Td2l0Y2g6IGZhbHNlXG4gICAgICAgIH07XG5cbiAgICAgICAgZXh0cmEgPSB7fTtcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgZXh0cmEucmFuZ2UgPSAodHlwZW9mIG9wdGlvbnMucmFuZ2UgPT09ICdib29sZWFuJykgJiYgb3B0aW9ucy5yYW5nZTtcbiAgICAgICAgICAgIGV4dHJhLmxvYyA9ICh0eXBlb2Ygb3B0aW9ucy5sb2MgPT09ICdib29sZWFuJykgJiYgb3B0aW9ucy5sb2M7XG4gICAgICAgICAgICBleHRyYS5yYXcgPSAodHlwZW9mIG9wdGlvbnMucmF3ID09PSAnYm9vbGVhbicpICYmIG9wdGlvbnMucmF3O1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLnRva2VucyA9PT0gJ2Jvb2xlYW4nICYmIG9wdGlvbnMudG9rZW5zKSB7XG4gICAgICAgICAgICAgICAgZXh0cmEudG9rZW5zID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuY29tbWVudCA9PT0gJ2Jvb2xlYW4nICYmIG9wdGlvbnMuY29tbWVudCkge1xuICAgICAgICAgICAgICAgIGV4dHJhLmNvbW1lbnRzID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMudG9sZXJhbnQgPT09ICdib29sZWFuJyAmJiBvcHRpb25zLnRvbGVyYW50KSB7XG4gICAgICAgICAgICAgICAgZXh0cmEuZXJyb3JzID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzb3VyY2VbMF0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJ5IGZpcnN0IHRvIGNvbnZlcnQgdG8gYSBzdHJpbmcuIFRoaXMgaXMgZ29vZCBhcyBmYXN0IHBhdGhcbiAgICAgICAgICAgICAgICAvLyBmb3Igb2xkIElFIHdoaWNoIHVuZGVyc3RhbmRzIHN0cmluZyBpbmRleGluZyBmb3Igc3RyaW5nXG4gICAgICAgICAgICAgICAgLy8gbGl0ZXJhbHMgb25seSBhbmQgbm90IGZvciBzdHJpbmcgb2JqZWN0LlxuICAgICAgICAgICAgICAgIGlmIChjb2RlIGluc3RhbmNlb2YgU3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZSA9IGNvZGUudmFsdWVPZigpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEZvcmNlIGFjY2Vzc2luZyB0aGUgY2hhcmFjdGVycyB2aWEgYW4gYXJyYXkuXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBzb3VyY2VbMF0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZSA9IHN0cmluZ1RvQXJyYXkoY29kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcGF0Y2goKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHByb2dyYW0gPSBwYXJzZVByb2dyYW0oKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZXh0cmEuY29tbWVudHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgZmlsdGVyQ29tbWVudExvY2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgcHJvZ3JhbS5jb21tZW50cyA9IGV4dHJhLmNvbW1lbnRzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBleHRyYS50b2tlbnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgZmlsdGVyVG9rZW5Mb2NhdGlvbigpO1xuICAgICAgICAgICAgICAgIHByb2dyYW0udG9rZW5zID0gZXh0cmEudG9rZW5zO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBleHRyYS5lcnJvcnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcHJvZ3JhbS5lcnJvcnMgPSBleHRyYS5lcnJvcnM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXh0cmEucmFuZ2UgfHwgZXh0cmEubG9jKSB7XG4gICAgICAgICAgICAgICAgcHJvZ3JhbS5ib2R5ID0gZmlsdGVyR3JvdXAocHJvZ3JhbS5ib2R5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHVucGF0Y2goKTtcbiAgICAgICAgICAgIGV4dHJhID0ge307XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcHJvZ3JhbTtcbiAgICB9XG5cbiAgICAvLyBTeW5jIHdpdGggcGFja2FnZS5qc29uLlxuICAgIGV4cG9ydHMudmVyc2lvbiA9ICcxLjAuMyc7XG5cbiAgICBleHBvcnRzLnBhcnNlID0gcGFyc2U7XG5cbiAgICAvLyBEZWVwIGNvcHkuXG4gICAgZXhwb3J0cy5TeW50YXggPSAoZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbmFtZSwgdHlwZXMgPSB7fTtcblxuICAgICAgICBpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHR5cGVzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAobmFtZSBpbiBTeW50YXgpIHtcbiAgICAgICAgICAgIGlmIChTeW50YXguaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0eXBlc1tuYW1lXSA9IFN5bnRheFtuYW1lXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgT2JqZWN0LmZyZWV6ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgT2JqZWN0LmZyZWV6ZSh0eXBlcyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHlwZXM7XG4gICAgfSgpKTtcblxufSkpO1xuLyogdmltOiBzZXQgc3c9NCB0cz00IGV0IHR3PTgwIDogKi9cbiIsIi8qXG4gIENvcHlyaWdodCAoQykgMjAxMiBZdXN1a2UgU3V6dWtpIDx1dGF0YW5lLnRlYUBnbWFpbC5jb20+XG4gIENvcHlyaWdodCAoQykgMjAxMiBBcml5YSBIaWRheWF0IDxhcml5YS5oaWRheWF0QGdtYWlsLmNvbT5cblxuICBSZWRpc3RyaWJ1dGlvbiBhbmQgdXNlIGluIHNvdXJjZSBhbmQgYmluYXJ5IGZvcm1zLCB3aXRoIG9yIHdpdGhvdXRcbiAgbW9kaWZpY2F0aW9uLCBhcmUgcGVybWl0dGVkIHByb3ZpZGVkIHRoYXQgdGhlIGZvbGxvd2luZyBjb25kaXRpb25zIGFyZSBtZXQ6XG5cbiAgICAqIFJlZGlzdHJpYnV0aW9ucyBvZiBzb3VyY2UgY29kZSBtdXN0IHJldGFpbiB0aGUgYWJvdmUgY29weXJpZ2h0XG4gICAgICBub3RpY2UsIHRoaXMgbGlzdCBvZiBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIuXG4gICAgKiBSZWRpc3RyaWJ1dGlvbnMgaW4gYmluYXJ5IGZvcm0gbXVzdCByZXByb2R1Y2UgdGhlIGFib3ZlIGNvcHlyaWdodFxuICAgICAgbm90aWNlLCB0aGlzIGxpc3Qgb2YgY29uZGl0aW9ucyBhbmQgdGhlIGZvbGxvd2luZyBkaXNjbGFpbWVyIGluIHRoZVxuICAgICAgZG9jdW1lbnRhdGlvbiBhbmQvb3Igb3RoZXIgbWF0ZXJpYWxzIHByb3ZpZGVkIHdpdGggdGhlIGRpc3RyaWJ1dGlvbi5cblxuICBUSElTIFNPRlRXQVJFIElTIFBST1ZJREVEIEJZIFRIRSBDT1BZUklHSFQgSE9MREVSUyBBTkQgQ09OVFJJQlVUT1JTIFwiQVMgSVNcIlxuICBBTkQgQU5ZIEVYUFJFU1MgT1IgSU1QTElFRCBXQVJSQU5USUVTLCBJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgVEhFXG4gIElNUExJRUQgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFkgQU5EIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFXG4gIEFSRSBESVNDTEFJTUVELiBJTiBOTyBFVkVOVCBTSEFMTCA8Q09QWVJJR0hUIEhPTERFUj4gQkUgTElBQkxFIEZPUiBBTllcbiAgRElSRUNULCBJTkRJUkVDVCwgSU5DSURFTlRBTCwgU1BFQ0lBTCwgRVhFTVBMQVJZLCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVNcbiAgKElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBQUk9DVVJFTUVOVCBPRiBTVUJTVElUVVRFIEdPT0RTIE9SIFNFUlZJQ0VTO1xuICBMT1NTIE9GIFVTRSwgREFUQSwgT1IgUFJPRklUUzsgT1IgQlVTSU5FU1MgSU5URVJSVVBUSU9OKSBIT1dFVkVSIENBVVNFRCBBTkRcbiAgT04gQU5ZIFRIRU9SWSBPRiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQ09OVFJBQ1QsIFNUUklDVCBMSUFCSUxJVFksIE9SIFRPUlRcbiAgKElOQ0xVRElORyBORUdMSUdFTkNFIE9SIE9USEVSV0lTRSkgQVJJU0lORyBJTiBBTlkgV0FZIE9VVCBPRiBUSEUgVVNFIE9GXG4gIFRISVMgU09GVFdBUkUsIEVWRU4gSUYgQURWSVNFRCBPRiBUSEUgUE9TU0lCSUxJVFkgT0YgU1VDSCBEQU1BR0UuXG4qL1xuXG4vKmpzbGludCBiaXR3aXNlOnRydWUgKi9cbi8qZ2xvYmFsIGV4cG9ydHM6dHJ1ZSwgZGVmaW5lOnRydWUsIHdpbmRvdzp0cnVlICovXG4oZnVuY3Rpb24gKGZhY3RvcnkpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBVbml2ZXJzYWwgTW9kdWxlIERlZmluaXRpb24gKFVNRCkgdG8gc3VwcG9ydCBBTUQsIENvbW1vbkpTL05vZGUuanMsXG4gICAgLy8gYW5kIHBsYWluIGJyb3dzZXIgbG9hZGluZyxcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShbJ2V4cG9ydHMnXSwgZmFjdG9yeSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgZmFjdG9yeShleHBvcnRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmYWN0b3J5KCh3aW5kb3cuZXN0cmF2ZXJzZSA9IHt9KSk7XG4gICAgfVxufShmdW5jdGlvbiAoZXhwb3J0cykge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBTeW50YXgsXG4gICAgICAgIGlzQXJyYXksXG4gICAgICAgIFZpc2l0b3JPcHRpb24sXG4gICAgICAgIFZpc2l0b3JLZXlzLFxuICAgICAgICB3cmFwcGVycztcblxuICAgIFN5bnRheCA9IHtcbiAgICAgICAgQXNzaWdubWVudEV4cHJlc3Npb246ICdBc3NpZ25tZW50RXhwcmVzc2lvbicsXG4gICAgICAgIEFycmF5RXhwcmVzc2lvbjogJ0FycmF5RXhwcmVzc2lvbicsXG4gICAgICAgIEJsb2NrU3RhdGVtZW50OiAnQmxvY2tTdGF0ZW1lbnQnLFxuICAgICAgICBCaW5hcnlFeHByZXNzaW9uOiAnQmluYXJ5RXhwcmVzc2lvbicsXG4gICAgICAgIEJyZWFrU3RhdGVtZW50OiAnQnJlYWtTdGF0ZW1lbnQnLFxuICAgICAgICBDYWxsRXhwcmVzc2lvbjogJ0NhbGxFeHByZXNzaW9uJyxcbiAgICAgICAgQ2F0Y2hDbGF1c2U6ICdDYXRjaENsYXVzZScsXG4gICAgICAgIENvbmRpdGlvbmFsRXhwcmVzc2lvbjogJ0NvbmRpdGlvbmFsRXhwcmVzc2lvbicsXG4gICAgICAgIENvbnRpbnVlU3RhdGVtZW50OiAnQ29udGludWVTdGF0ZW1lbnQnLFxuICAgICAgICBEZWJ1Z2dlclN0YXRlbWVudDogJ0RlYnVnZ2VyU3RhdGVtZW50JyxcbiAgICAgICAgRGlyZWN0aXZlU3RhdGVtZW50OiAnRGlyZWN0aXZlU3RhdGVtZW50JyxcbiAgICAgICAgRG9XaGlsZVN0YXRlbWVudDogJ0RvV2hpbGVTdGF0ZW1lbnQnLFxuICAgICAgICBFbXB0eVN0YXRlbWVudDogJ0VtcHR5U3RhdGVtZW50JyxcbiAgICAgICAgRXhwcmVzc2lvblN0YXRlbWVudDogJ0V4cHJlc3Npb25TdGF0ZW1lbnQnLFxuICAgICAgICBGb3JTdGF0ZW1lbnQ6ICdGb3JTdGF0ZW1lbnQnLFxuICAgICAgICBGb3JJblN0YXRlbWVudDogJ0ZvckluU3RhdGVtZW50JyxcbiAgICAgICAgRnVuY3Rpb25EZWNsYXJhdGlvbjogJ0Z1bmN0aW9uRGVjbGFyYXRpb24nLFxuICAgICAgICBGdW5jdGlvbkV4cHJlc3Npb246ICdGdW5jdGlvbkV4cHJlc3Npb24nLFxuICAgICAgICBJZGVudGlmaWVyOiAnSWRlbnRpZmllcicsXG4gICAgICAgIElmU3RhdGVtZW50OiAnSWZTdGF0ZW1lbnQnLFxuICAgICAgICBMaXRlcmFsOiAnTGl0ZXJhbCcsXG4gICAgICAgIExhYmVsZWRTdGF0ZW1lbnQ6ICdMYWJlbGVkU3RhdGVtZW50JyxcbiAgICAgICAgTG9naWNhbEV4cHJlc3Npb246ICdMb2dpY2FsRXhwcmVzc2lvbicsXG4gICAgICAgIE1lbWJlckV4cHJlc3Npb246ICdNZW1iZXJFeHByZXNzaW9uJyxcbiAgICAgICAgTmV3RXhwcmVzc2lvbjogJ05ld0V4cHJlc3Npb24nLFxuICAgICAgICBPYmplY3RFeHByZXNzaW9uOiAnT2JqZWN0RXhwcmVzc2lvbicsXG4gICAgICAgIFByb2dyYW06ICdQcm9ncmFtJyxcbiAgICAgICAgUHJvcGVydHk6ICdQcm9wZXJ0eScsXG4gICAgICAgIFJldHVyblN0YXRlbWVudDogJ1JldHVyblN0YXRlbWVudCcsXG4gICAgICAgIFNlcXVlbmNlRXhwcmVzc2lvbjogJ1NlcXVlbmNlRXhwcmVzc2lvbicsXG4gICAgICAgIFN3aXRjaFN0YXRlbWVudDogJ1N3aXRjaFN0YXRlbWVudCcsXG4gICAgICAgIFN3aXRjaENhc2U6ICdTd2l0Y2hDYXNlJyxcbiAgICAgICAgVGhpc0V4cHJlc3Npb246ICdUaGlzRXhwcmVzc2lvbicsXG4gICAgICAgIFRocm93U3RhdGVtZW50OiAnVGhyb3dTdGF0ZW1lbnQnLFxuICAgICAgICBUcnlTdGF0ZW1lbnQ6ICdUcnlTdGF0ZW1lbnQnLFxuICAgICAgICBVbmFyeUV4cHJlc3Npb246ICdVbmFyeUV4cHJlc3Npb24nLFxuICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnVXBkYXRlRXhwcmVzc2lvbicsXG4gICAgICAgIFZhcmlhYmxlRGVjbGFyYXRpb246ICdWYXJpYWJsZURlY2xhcmF0aW9uJyxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdG9yOiAnVmFyaWFibGVEZWNsYXJhdG9yJyxcbiAgICAgICAgV2hpbGVTdGF0ZW1lbnQ6ICdXaGlsZVN0YXRlbWVudCcsXG4gICAgICAgIFdpdGhTdGF0ZW1lbnQ6ICdXaXRoU3RhdGVtZW50J1xuICAgIH07XG5cbiAgICBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcbiAgICBpZiAoIWlzQXJyYXkpIHtcbiAgICAgICAgaXNBcnJheSA9IGZ1bmN0aW9uIGlzQXJyYXkoYXJyYXkpIHtcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyYXkpID09PSAnW29iamVjdCBBcnJheV0nO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIFZpc2l0b3JLZXlzID0ge1xuICAgICAgICBBc3NpZ25tZW50RXhwcmVzc2lvbjogWydsZWZ0JywgJ3JpZ2h0J10sXG4gICAgICAgIEFycmF5RXhwcmVzc2lvbjogWydlbGVtZW50cyddLFxuICAgICAgICBCbG9ja1N0YXRlbWVudDogWydib2R5J10sXG4gICAgICAgIEJpbmFyeUV4cHJlc3Npb246IFsnbGVmdCcsICdyaWdodCddLFxuICAgICAgICBCcmVha1N0YXRlbWVudDogWydsYWJlbCddLFxuICAgICAgICBDYWxsRXhwcmVzc2lvbjogWydjYWxsZWUnLCAnYXJndW1lbnRzJ10sXG4gICAgICAgIENhdGNoQ2xhdXNlOiBbJ3BhcmFtJywgJ2JvZHknXSxcbiAgICAgICAgQ29uZGl0aW9uYWxFeHByZXNzaW9uOiBbJ3Rlc3QnLCAnY29uc2VxdWVudCcsICdhbHRlcm5hdGUnXSxcbiAgICAgICAgQ29udGludWVTdGF0ZW1lbnQ6IFsnbGFiZWwnXSxcbiAgICAgICAgRGVidWdnZXJTdGF0ZW1lbnQ6IFtdLFxuICAgICAgICBEaXJlY3RpdmVTdGF0ZW1lbnQ6IFtdLFxuICAgICAgICBEb1doaWxlU3RhdGVtZW50OiBbJ2JvZHknLCAndGVzdCddLFxuICAgICAgICBFbXB0eVN0YXRlbWVudDogW10sXG4gICAgICAgIEV4cHJlc3Npb25TdGF0ZW1lbnQ6IFsnZXhwcmVzc2lvbiddLFxuICAgICAgICBGb3JTdGF0ZW1lbnQ6IFsnaW5pdCcsICd0ZXN0JywgJ3VwZGF0ZScsICdib2R5J10sXG4gICAgICAgIEZvckluU3RhdGVtZW50OiBbJ2xlZnQnLCAncmlnaHQnLCAnYm9keSddLFxuICAgICAgICBGdW5jdGlvbkRlY2xhcmF0aW9uOiBbJ2lkJywgJ3BhcmFtcycsICdib2R5J10sXG4gICAgICAgIEZ1bmN0aW9uRXhwcmVzc2lvbjogWydpZCcsICdwYXJhbXMnLCAnYm9keSddLFxuICAgICAgICBJZGVudGlmaWVyOiBbXSxcbiAgICAgICAgSWZTdGF0ZW1lbnQ6IFsndGVzdCcsICdjb25zZXF1ZW50JywgJ2FsdGVybmF0ZSddLFxuICAgICAgICBMaXRlcmFsOiBbXSxcbiAgICAgICAgTGFiZWxlZFN0YXRlbWVudDogWydsYWJlbCcsICdib2R5J10sXG4gICAgICAgIExvZ2ljYWxFeHByZXNzaW9uOiBbJ2xlZnQnLCAncmlnaHQnXSxcbiAgICAgICAgTWVtYmVyRXhwcmVzc2lvbjogWydvYmplY3QnLCAncHJvcGVydHknXSxcbiAgICAgICAgTmV3RXhwcmVzc2lvbjogWydjYWxsZWUnLCAnYXJndW1lbnRzJ10sXG4gICAgICAgIE9iamVjdEV4cHJlc3Npb246IFsncHJvcGVydGllcyddLFxuICAgICAgICBQcm9ncmFtOiBbJ2JvZHknXSxcbiAgICAgICAgUHJvcGVydHk6IFsna2V5JywgJ3ZhbHVlJ10sXG4gICAgICAgIFJldHVyblN0YXRlbWVudDogWydhcmd1bWVudCddLFxuICAgICAgICBTZXF1ZW5jZUV4cHJlc3Npb246IFsnZXhwcmVzc2lvbnMnXSxcbiAgICAgICAgU3dpdGNoU3RhdGVtZW50OiBbJ2Rpc2NyaW1pbmFudCcsICdjYXNlcyddLFxuICAgICAgICBTd2l0Y2hDYXNlOiBbJ3Rlc3QnLCAnY29uc2VxdWVudCddLFxuICAgICAgICBUaGlzRXhwcmVzc2lvbjogW10sXG4gICAgICAgIFRocm93U3RhdGVtZW50OiBbJ2FyZ3VtZW50J10sXG4gICAgICAgIFRyeVN0YXRlbWVudDogWydibG9jaycsICdoYW5kbGVycycsICdmaW5hbGl6ZXInXSxcbiAgICAgICAgVW5hcnlFeHByZXNzaW9uOiBbJ2FyZ3VtZW50J10sXG4gICAgICAgIFVwZGF0ZUV4cHJlc3Npb246IFsnYXJndW1lbnQnXSxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdGlvbjogWydkZWNsYXJhdGlvbnMnXSxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdG9yOiBbJ2lkJywgJ2luaXQnXSxcbiAgICAgICAgV2hpbGVTdGF0ZW1lbnQ6IFsndGVzdCcsICdib2R5J10sXG4gICAgICAgIFdpdGhTdGF0ZW1lbnQ6IFsnb2JqZWN0JywgJ2JvZHknXVxuICAgIH07XG5cbiAgICBWaXNpdG9yT3B0aW9uID0ge1xuICAgICAgICBCcmVhazogMSxcbiAgICAgICAgU2tpcDogMlxuICAgIH07XG5cbiAgICB3cmFwcGVycyA9IHtcbiAgICAgICAgUHJvcGVydHlXcmFwcGVyOiAnUHJvcGVydHknXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHRyYXZlcnNlKHRvcCwgdmlzaXRvcikge1xuICAgICAgICB2YXIgd29ya2xpc3QsIGxlYXZlbGlzdCwgbm9kZSwgbm9kZVR5cGUsIHJldCwgY3VycmVudCwgY3VycmVudDIsIGNhbmRpZGF0ZXMsIGNhbmRpZGF0ZSwgbWFya2VyID0ge307XG5cbiAgICAgICAgd29ya2xpc3QgPSBbIHRvcCBdO1xuICAgICAgICBsZWF2ZWxpc3QgPSBbIG51bGwgXTtcblxuICAgICAgICB3aGlsZSAod29ya2xpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICBub2RlID0gd29ya2xpc3QucG9wKCk7XG4gICAgICAgICAgICBub2RlVHlwZSA9IG5vZGUudHlwZTtcblxuICAgICAgICAgICAgaWYgKG5vZGUgPT09IG1hcmtlcikge1xuICAgICAgICAgICAgICAgIG5vZGUgPSBsZWF2ZWxpc3QucG9wKCk7XG4gICAgICAgICAgICAgICAgaWYgKHZpc2l0b3IubGVhdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0ID0gdmlzaXRvci5sZWF2ZShub2RlLCBsZWF2ZWxpc3RbbGVhdmVsaXN0Lmxlbmd0aCAtIDFdKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChyZXQgPT09IFZpc2l0b3JPcHRpb24uQnJlYWspIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAobm9kZSkge1xuICAgICAgICAgICAgICAgIGlmICh3cmFwcGVycy5oYXNPd25Qcm9wZXJ0eShub2RlVHlwZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZSA9IG5vZGUubm9kZTtcbiAgICAgICAgICAgICAgICAgICAgbm9kZVR5cGUgPSB3cmFwcGVyc1tub2RlVHlwZV07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHZpc2l0b3IuZW50ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0ID0gdmlzaXRvci5lbnRlcihub2RlLCBsZWF2ZWxpc3RbbGVhdmVsaXN0Lmxlbmd0aCAtIDFdKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHJldCA9PT0gVmlzaXRvck9wdGlvbi5CcmVhaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChtYXJrZXIpO1xuICAgICAgICAgICAgICAgIGxlYXZlbGlzdC5wdXNoKG5vZGUpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJldCAhPT0gVmlzaXRvck9wdGlvbi5Ta2lwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZXMgPSBWaXNpdG9yS2V5c1tub2RlVHlwZV07XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBjYW5kaWRhdGVzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKChjdXJyZW50IC09IDEpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZSA9IG5vZGVbY2FuZGlkYXRlc1tjdXJyZW50XV07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FuZGlkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQXJyYXkoY2FuZGlkYXRlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50MiA9IGNhbmRpZGF0ZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlICgoY3VycmVudDIgLT0gMSkgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZVtjdXJyZW50Ml0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihub2RlVHlwZSA9PT0gU3ludGF4Lk9iamVjdEV4cHJlc3Npb24gJiYgJ3Byb3BlcnRpZXMnID09PSBjYW5kaWRhdGVzW2N1cnJlbnRdICYmIG51bGwgPT0gY2FuZGlkYXRlc1tjdXJyZW50XS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtsaXN0LnB1c2goe3R5cGU6ICdQcm9wZXJ0eVdyYXBwZXInLCBub2RlOiBjYW5kaWRhdGVbY3VycmVudDJdfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChjYW5kaWRhdGVbY3VycmVudDJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JrbGlzdC5wdXNoKGNhbmRpZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVwbGFjZSh0b3AsIHZpc2l0b3IpIHtcbiAgICAgICAgdmFyIHdvcmtsaXN0LCBsZWF2ZWxpc3QsIG5vZGUsIG5vZGVUeXBlLCB0YXJnZXQsIHR1cGxlLCByZXQsIGN1cnJlbnQsIGN1cnJlbnQyLCBjYW5kaWRhdGVzLCBjYW5kaWRhdGUsIG1hcmtlciA9IHt9LCByZXN1bHQ7XG5cbiAgICAgICAgcmVzdWx0ID0ge1xuICAgICAgICAgICAgdG9wOiB0b3BcbiAgICAgICAgfTtcblxuICAgICAgICB0dXBsZSA9IFsgdG9wLCByZXN1bHQsICd0b3AnIF07XG4gICAgICAgIHdvcmtsaXN0ID0gWyB0dXBsZSBdO1xuICAgICAgICBsZWF2ZWxpc3QgPSBbIHR1cGxlIF07XG5cbiAgICAgICAgZnVuY3Rpb24gbm90aWZ5KHYpIHtcbiAgICAgICAgICAgIHJldCA9IHY7XG4gICAgICAgIH1cblxuICAgICAgICB3aGlsZSAod29ya2xpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICB0dXBsZSA9IHdvcmtsaXN0LnBvcCgpO1xuXG4gICAgICAgICAgICBpZiAodHVwbGUgPT09IG1hcmtlcikge1xuICAgICAgICAgICAgICAgIHR1cGxlID0gbGVhdmVsaXN0LnBvcCgpO1xuICAgICAgICAgICAgICAgIHJldCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBpZiAodmlzaXRvci5sZWF2ZSkge1xuICAgICAgICAgICAgICAgICAgICBub2RlID0gdHVwbGVbMF07XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldCA9IHZpc2l0b3IubGVhdmUodHVwbGVbMF0sIGxlYXZlbGlzdFtsZWF2ZWxpc3QubGVuZ3RoIC0gMV1bMF0sIG5vdGlmeSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0YXJnZXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZSA9IHRhcmdldDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0dXBsZVsxXVt0dXBsZVsyXV0gPSBub2RlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocmV0ID09PSBWaXNpdG9yT3B0aW9uLkJyZWFrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQudG9wO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHVwbGVbMF0pIHtcbiAgICAgICAgICAgICAgICByZXQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgbm9kZSA9IHR1cGxlWzBdO1xuXG4gICAgICAgICAgICAgICAgbm9kZVR5cGUgPSBub2RlLnR5cGU7XG4gICAgICAgICAgICAgICAgaWYgKHdyYXBwZXJzLmhhc093blByb3BlcnR5KG5vZGVUeXBlKSkge1xuICAgICAgICAgICAgICAgICAgICB0dXBsZVswXSA9IG5vZGUgPSBub2RlLm5vZGU7XG4gICAgICAgICAgICAgICAgICAgIG5vZGVUeXBlID0gd3JhcHBlcnNbbm9kZVR5cGVdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICh2aXNpdG9yLmVudGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldCA9IHZpc2l0b3IuZW50ZXIodHVwbGVbMF0sIGxlYXZlbGlzdFtsZWF2ZWxpc3QubGVuZ3RoIC0gMV1bMF0sIG5vdGlmeSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0YXJnZXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZSA9IHRhcmdldDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0dXBsZVsxXVt0dXBsZVsyXV0gPSBub2RlO1xuICAgICAgICAgICAgICAgICAgICB0dXBsZVswXSA9IG5vZGU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHJldCA9PT0gVmlzaXRvck9wdGlvbi5CcmVhaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0LnRvcDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAodHVwbGVbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChtYXJrZXIpO1xuICAgICAgICAgICAgICAgICAgICBsZWF2ZWxpc3QucHVzaCh0dXBsZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJldCAhPT0gVmlzaXRvck9wdGlvbi5Ta2lwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGVzID0gVmlzaXRvcktleXNbbm9kZVR5cGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudCA9IGNhbmRpZGF0ZXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKChjdXJyZW50IC09IDEpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGUgPSBub2RlW2NhbmRpZGF0ZXNbY3VycmVudF1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjYW5kaWRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQXJyYXkoY2FuZGlkYXRlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudDIgPSBjYW5kaWRhdGUubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKChjdXJyZW50MiAtPSAxKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZVtjdXJyZW50Ml0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYobm9kZVR5cGUgPT09IFN5bnRheC5PYmplY3RFeHByZXNzaW9uICYmICdwcm9wZXJ0aWVzJyA9PT0gY2FuZGlkYXRlc1tjdXJyZW50XSAmJiBudWxsID09IGNhbmRpZGF0ZXNbY3VycmVudF0udHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChbe3R5cGU6ICdQcm9wZXJ0eVdyYXBwZXInLCBub2RlOiBjYW5kaWRhdGVbY3VycmVudDJdfSwgY2FuZGlkYXRlLCBjdXJyZW50Ml0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChbY2FuZGlkYXRlW2N1cnJlbnQyXSwgY2FuZGlkYXRlLCBjdXJyZW50Ml0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChbY2FuZGlkYXRlLCBub2RlLCBjYW5kaWRhdGVzW2N1cnJlbnRdXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0LnRvcDtcbiAgICB9XG5cbiAgICBleHBvcnRzLnZlcnNpb24gPSAnMC4wLjQnO1xuICAgIGV4cG9ydHMuU3ludGF4ID0gU3ludGF4O1xuICAgIGV4cG9ydHMudHJhdmVyc2UgPSB0cmF2ZXJzZTtcbiAgICBleHBvcnRzLnJlcGxhY2UgPSByZXBsYWNlO1xuICAgIGV4cG9ydHMuVmlzaXRvcktleXMgPSBWaXNpdG9yS2V5cztcbiAgICBleHBvcnRzLlZpc2l0b3JPcHRpb24gPSBWaXNpdG9yT3B0aW9uO1xufSkpO1xuLyogdmltOiBzZXQgc3c9NCB0cz00IGV0IHR3PTgwIDogKi9cbiIsIihmdW5jdGlvbiAobnMpIHtcblxuICAgIHZhciB3YWxrID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLFxuICAgICAgICBDb250ZXh0ID0gcmVxdWlyZShcIi4vLi4vYmFzZS9jb250ZXh0LmpzXCIpLmdldENvbnRleHQobnVsbCksXG4gICAgICAgIFN5bnRheCA9IHdhbGsuU3ludGF4O1xuXG4gICAgdmFyIGZpbmRQYXJhbWV0ZXJzSW5Qcm9ncmFtID0gZnVuY3Rpb24gKHByb2dyYW0sIGNvbnRleHROYW1lLCBwYXJhbSwgYW5hbHl6ZWRDYWxscykge1xuICAgICAgICB2YXIgY29udGV4dFN0YWNrID0gW25ldyBDb250ZXh0KHByb2dyYW0sIG51bGwsIHtuYW1lOiBcImdsb2JhbFwifSldO1xuICAgICAgICB2YXIgZm91bmRQYXJhbXMgPSBbXTtcbiAgICAgICAgYW5hbHl6ZWRDYWxscyA9IGFuYWx5emVkQ2FsbHMgfHwge307XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJMb29raW5nIGZvcjogXCIsIGNvbnRleHROYW1lLCBwYXJhbSk7XG5cbiAgICAgICAgdmFyIGFjdGl2ZVBhcmFtID0gbnVsbDtcbiAgICAgICAgd2Fsay50cmF2ZXJzZShwcm9ncmFtLCB7XG4gICAgICAgICAgICBlbnRlcjogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IG5vZGUudHlwZSxcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dDtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwYXJlbnRDb250ZXh0ID0gY29udGV4dFN0YWNrW2NvbnRleHRTdGFjay5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudENvbnRleHQuZGVjbGFyZVZhcmlhYmxlKG5vZGUuaWQubmFtZSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dCA9IG5ldyBDb250ZXh0KG5vZGUsIHBhcmVudENvbnRleHQsIHtuYW1lOiBub2RlLmlkLm5hbWUgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0U3RhY2sucHVzaChjb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250ZXh0LnN0cigpID09IGNvbnRleHROYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUucGFyYW1zLmxlbmd0aCA+IHBhcmFtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZVBhcmFtID0gbm9kZS5wYXJhbXNbcGFyYW1dLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkNhbGxFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBvcyA9IG5vZGUuYXJndW1lbnRzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgY3VyciwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3Vyci5uYW1lID09IGFjdGl2ZVBhcmFtKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAtMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocG9zICE9IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dCA9IGNvbnRleHRTdGFja1tjb250ZXh0U3RhY2subGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkID0gY29udGV4dC5nZXRWYXJpYWJsZUlkZW50aWZpZXIobm9kZS5jYWxsZWUubmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFhbmFseXplZENhbGxzW2lkXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmFseXplZENhbGxzW2lkXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kUGFyYW1zID0gZm91bmRQYXJhbXMuY29uY2F0KGZpbmRQYXJhbWV0ZXJzSW5Qcm9ncmFtKHByb2dyYW0sIGlkLCBwb3MsIGFuYWx5emVkQ2FsbHMpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsZWF2ZTogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IG5vZGUudHlwZTtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHRTdGFjay5wb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZVBhcmFtID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5NZW1iZXJFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdGl2ZVBhcmFtICYmIG5vZGUub2JqZWN0Lm5hbWUgPT0gYWN0aXZlUGFyYW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1ldGVyTmFtZSA9IG5vZGUucHJvcGVydHkubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZm91bmRQYXJhbXMuaW5kZXhPZihwYXJhbWV0ZXJOYW1lKSA9PSAtMSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm91bmRQYXJhbXMucHVzaChwYXJhbWV0ZXJOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGZvdW5kUGFyYW1zO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge29iamVjdCF9IHByb2dyYW1cbiAgICAgKiBAcGFyYW0ge29iamVjdD99IG9wdFxuICAgICAqL1xuICAgIG5zLmV4dHJhY3RQYXJhbWV0ZXJzID0gZnVuY3Rpb24gKHByb2dyYW0sIG9wdCkge1xuICAgICAgICBvcHQgPSBvcHQgfHwge307XG4gICAgICAgIHZhciBjb250ZXh0ID0gb3B0LmNvbnRleHQgfHwgXCJnbG9iYWwuc2hhZGVcIjtcbiAgICAgICAgdmFyIHBhcmFtID0gb3B0LnBhcmFtIHx8IDA7XG5cbiAgICAgICAgcmV0dXJuIGZpbmRQYXJhbWV0ZXJzSW5Qcm9ncmFtKHByb2dyYW0sIGNvbnRleHQsIHBhcmFtKTtcbiAgICB9O1xuXG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uIChucykge1xuXG4gICAgdmFyIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXgsXG4gICAgICAgIFZpc2l0b3JPcHRpb24gPSByZXF1aXJlKCdlc3RyYXZlcnNlJykuVmlzaXRvck9wdGlvbixcbiAgICAgICAgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgVFlQRVMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgQW5ub3RhdGlvbiA9IHJlcXVpcmUoXCIuLy4uLy4uL2Jhc2UvYW5ub3RhdGlvbi5qc1wiKS5Bbm5vdGF0aW9uLFxuICAgICAgICBCYXNlID0gcmVxdWlyZShcIi4vLi4vLi4vYmFzZS9pbmRleC5qc1wiKTtcblxuXG4gICAgdmFyIEJpbmFyeUZ1bmN0aW9ucyA9IHtcbiAgICAgICAgXCIrXCIgOiBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGEgKyBiOyB9LFxuICAgICAgICBcIi1cIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSAtIGI7IH0sXG4gICAgICAgIFwiL1wiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhIC8gYjsgfSxcbiAgICAgICAgXCIqXCIgOiBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGEgKiBiOyB9LFxuICAgICAgICBcIiVcIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSAlIGI7IH0sXG5cbiAgICAgICAgXCI9PVwiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhID09IGI7IH0sXG4gICAgICAgIFwiIT1cIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSAhPSBiOyB9LFxuICAgICAgICBcIj09PVwiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhID09PSBiOyB9LFxuICAgICAgICBcIiE9PVwiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhICE9PSBiOyB9LFxuICAgICAgICBcIjxcIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSA8IGI7IH0sXG4gICAgICAgIFwiPD1cIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSA8PSBiOyB9LFxuICAgICAgICBcIj5cIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSA+IGI7IH0sXG4gICAgICAgIFwiPj1cIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSA+PSBiOyB9XG4gICAgICAgIH07XG5cbiAgICB2YXIgVW5hcnlGdW5jdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgXCIhXCI6IGZ1bmN0aW9uKGEpIHsgcmV0dXJuICFhOyB9LFxuICAgICAgICAgICAgICAgIFwiLVwiOiBmdW5jdGlvbihhKSB7IHJldHVybiAtYTsgfSxcbiAgICAgICAgICAgICAgICBcIitcIjogZnVuY3Rpb24oYSkgeyByZXR1cm4gK2E7IH0sXG4gICAgICAgICAgICAgICAgXCJ0eXBlb2ZcIjogZnVuY3Rpb24oYSkgeyByZXR1cm4gdHlwZW9mIGE7IH0sXG4gICAgICAgICAgICAgICAgXCJ2b2lkXCI6IGZ1bmN0aW9uKGEpIHsgcmV0dXJuIHZvaWQgYTsgfSxcbiAgICAgICAgICAgICAgICBcImRlbGV0ZVwiOiBmdW5jdGlvbihhKSB7IHJldHVybiBkZWxldGUgYTsgfVxuXG4gICAgfTtcblxuXG4gICAgZnVuY3Rpb24gZ2V0T2JqZWN0UmVmZXJlbmNlRnJvbU5vZGUob2JqZWN0LCBjb250ZXh0KSB7XG4gICAgICAgIHN3aXRjaCAob2JqZWN0LnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk5ld0V4cHJlc3Npb246XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5DYWxsRXhwcmVzc2lvbjpcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk1lbWJlckV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuY3JlYXRlVHlwZUluZm8ob2JqZWN0KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LklkZW50aWZpZXI6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuZ2V0QmluZGluZ0J5TmFtZShvYmplY3QubmFtZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5UaGlzRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICByZXR1cm4gY29udGV4dC5nZXRCaW5kaW5nQnlOYW1lKFwidGhpc1wiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5oYW5kbGVkIG9iamVjdCB0eXBlIGluIFR5cGVJbmZlcmVuY2U6IFwiICsgb2JqZWN0LnR5cGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGV2YWx1YXRlVHJ1dGggPSBmdW5jdGlvbihleHApIHtcbiAgICAgICAgcmV0dXJuICEhZXhwO1xuICAgIH1cblxuICAgIHZhciBsb2cgPSBmdW5jdGlvbihzdHIpIHt9O1xuICAgIC8vdmFyIGxvZyA9IGZ1bmN0aW9uKCkgeyBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpOyB9O1xuXG5cbiAgICB2YXIgZW50ZXJIYW5kbGVycyA9IHtcbiAgICAgICAgLy8gT24gZW50ZXJcbiAgICAgICAgQ29uZGl0aW9uYWxFeHByZXNzaW9uOiBmdW5jdGlvbiAobm9kZSwgcGFyZW50LCBjdHgsIHJvb3QpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihub2RlKTtcblxuICAgICAgICAgICAgcm9vdC50cmF2ZXJzZShub2RlLnRlc3QpO1xuICAgICAgICAgICAgdmFyIHRlc3QgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZS50ZXN0KTtcblxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2cobm9kZS50ZXN0LCBub2RlLmNvbnNlcXVlbnQsIG5vZGUuYWx0ZXJuYXRlKTtcbiAgICAgICAgICAgIGlmICh0ZXN0Lmhhc1N0YXRpY1ZhbHVlKCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGVzdFJlc3VsdCA9IGV2YWx1YXRlVHJ1dGgodGVzdC5nZXRTdGF0aWNWYWx1ZSgpKTtcbiAgICAgICAgICAgICAgICBpZiAodGVzdFJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICByb290LnRyYXZlcnNlKG5vZGUuY29uc2VxdWVudCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNlcXVlbnQgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZS5jb25zZXF1ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmNvcHkoY29uc2VxdWVudCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhbHRlcm5hdGUgPSBuZXcgQW5ub3RhdGlvbihub2RlLmFsdGVybmF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGFsdGVybmF0ZS5lbGltaW5hdGUoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByb290LnRyYXZlcnNlKG5vZGUuYWx0ZXJuYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFsdGVybmF0ZSA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLmFsdGVybmF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5jb3B5KGFsdGVybmF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb25zZXF1ZW50ID0gbmV3IEFubm90YXRpb24obm9kZS5jb25zZXF1ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgY29uc2VxdWVudC5lbGltaW5hdGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFdlIGNhbid0IGRlY2lkZSwgdGh1cyB0cmF2ZXJzZSBib3RoO1xuICAgICAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS5jb25zZXF1ZW50KTtcbiAgICAgICAgICAgICAgICByb290LnRyYXZlcnNlKG5vZGUuYWx0ZXJuYXRlKTtcbiAgICAgICAgICAgICAgICB2YXIgY29uc2VxdWVudCA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLmNvbnNlcXVlbnQpLFxuICAgICAgICAgICAgICAgICAgICBhbHRlcm5hdGUgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZS5hbHRlcm5hdGUpO1xuXG5cbiAgICAgICAgICAgICAgICBpZiAoY29uc2VxdWVudC5lcXVhbHMoYWx0ZXJuYXRlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuY29weShjb25zZXF1ZW50KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNvbnNlcXVlbnQuY2FuTnVtYmVyKCkgJiYgYWx0ZXJuYXRlLmNhbk51bWJlcigpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLk5VTUJFUik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHRlc3QuaXNOdWxsT3JVbmRlZmluZWQoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShhbHRlcm5hdGUuZ2V0VHlwZSgpKVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFdlIGRvbid0IGFsbG93IGR5bmFtaWMgdHlwZXMgKHRoZSB0eXBlIG9mIHRoZSByZXN1bHQgZGVwZW5kcyBvbiB0aGUgdmFsdWUgb2YgaXQncyBvcGVyYW5kcykuXG4gICAgICAgICAgICAgICAgICAgIC8vIEF0IHRoaXMgcG9pbnQsIHRoZSBleHByZXNzaW9uIG5lZWRzIHRvIGV2YWx1YXRlIHRvIGEgcmVzdWx0LCBvdGhlcndpc2UgaXQncyBhbiBlcnJvclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBTaGFkZS50aHJvd0Vycm9yKG5vZGUsIFwiU3RhdGljIGV2YWx1YXRpb24gbm90IGltcGxlbWVudGVkIHlldFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gVmlzaXRvck9wdGlvbi5Ta2lwO1xuXG4gICAgICAgIH0sXG4gICAgICAgIExpdGVyYWw6IGZ1bmN0aW9uIChsaXRlcmFsKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKGxpdGVyYWwpO1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gbGl0ZXJhbC5yYXcgIT09IHVuZGVmaW5lZCA/IGxpdGVyYWwucmF3IDogbGl0ZXJhbC52YWx1ZSxcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihsaXRlcmFsKTtcblxuICAgICAgICAgICAgdmFyIG51bWJlciA9IHBhcnNlRmxvYXQodmFsdWUpO1xuXG4gICAgICAgICAgICBpZiAoIWlzTmFOKG51bWJlcikpIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUuaW5kZXhPZihcIi5cIikgPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuSU5UKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLk5VTUJFUik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRTdGF0aWNWYWx1ZShudW1iZXIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh2YWx1ZSA9PT0gJ3RydWUnKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuQk9PTEVBTik7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFN0YXRpY1ZhbHVlKHRydWUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh2YWx1ZSA9PT0gJ2ZhbHNlJykge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLkJPT0xFQU4pO1xuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRTdGF0aWNWYWx1ZShmYWxzZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHZhbHVlID09PSAnbnVsbCcpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5OVUxMKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuU1RSSU5HKTtcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0U3RhdGljVmFsdWUodmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGhhbmRsZXJzID0ge1xuICAgICAgICBBc3NpZ25tZW50RXhwcmVzc2lvbjogZnVuY3Rpb24gKG5vZGUsIGN0eCkge1xuICAgICAgICAgICAgdmFyIHJpZ2h0ID0gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUucmlnaHQpLFxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUpO1xuXG4gICAgICAgICAgICByZXN1bHQuY29weShyaWdodCk7XG4gICAgICAgICAgICBpZiAobm9kZS5sZWZ0LnR5cGUgPT0gU3ludGF4LklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IG5vZGUubGVmdC5uYW1lO1xuICAgICAgICAgICAgICAgIGlmIChjdHguaW5EZWNsYXJhdGlvbiA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBjdHguZGVjbGFyZVZhcmlhYmxlKG5hbWUsIHRydWUsIHJlc3VsdClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3R4LnVwZGF0ZUV4cHJlc3Npb24obmFtZSwgcmlnaHQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBc3NpZ25tZW50IGV4cHJlc3Npb25cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cblxuICAgICAgICBOZXdFeHByZXNzaW9uOiBmdW5jdGlvbihub2RlLCBwYXJlbnQsIGN0eCkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUpO1xuXG4gICAgICAgICAgICB2YXIgZW50cnkgPSBjdHguZ2V0QmluZGluZ0J5TmFtZShub2RlLmNhbGxlZS5uYW1lKTtcbiAgICAgICAgICAgIC8vY29uc29sZS5lcnJvcihlbnRyeSk7XG4gICAgICAgICAgICBpZiAoZW50cnkgJiYgZW50cnkuaGFzQ29uc3RydWN0b3IoKSkge1xuICAgICAgICAgICAgICAgIHZhciBjb25zdHJ1Y3RvciA9IGVudHJ5LmdldENvbnN0cnVjdG9yKCk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBbm5vdGF0aW9uLmNyZWF0ZUFubm90YXRlZE5vZGVBcnJheShub2RlLmFyZ3VtZW50cywgY3R4KTtcbiAgICAgICAgICAgICAgICB2YXIgZXh0cmEgPSBjb25zdHJ1Y3Rvci5ldmFsdWF0ZShyZXN1bHQsIGFyZ3MsIGN0eCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldEZyb21FeHRyYShleHRyYSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlJlZmVyZW5jZUVycm9yOiBcIiArIG5vZGUuY2FsbGVlLm5hbWUgKyBcIiBpcyBub3QgZGVmaW5lZFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBVbmFyeUV4cHJlc3Npb246IGZ1bmN0aW9uIChub2RlLCBjdHgpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihub2RlKSxcbiAgICAgICAgICAgICAgICBhcmd1bWVudCA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLmFyZ3VtZW50KSxcbiAgICAgICAgICAgICAgICBvcGVyYXRvciA9IG5vZGUub3BlcmF0b3IsXG4gICAgICAgICAgICAgICAgZnVuYyA9IFVuYXJ5RnVuY3Rpb25zW29wZXJhdG9yXTtcblxuICAgICAgICAgICAgc3dpdGNoIChvcGVyYXRvcikge1xuICAgICAgICAgICAgICAgIGNhc2UgXCIhXCI6XG5cbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuQk9PTEVBTik7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCIrXCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcIi1cIjpcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFyZ3VtZW50LmNhbkludCgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5JTlQpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFyZ3VtZW50LmNhbk51bWJlcigpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5OVU1CRVIpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgZXZhbHVhdGUgJ1wiICsgb3BlcmF0b3IgKyAnXCIgZm9yICcgKyBhcmd1bWVudCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcIn5cIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwidHlwZW9mXCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcInZvaWRcIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVsZXRlXCI6XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT3BlcmF0b3Igbm90IHlldCBzdXBwb3J0ZWQ6IFwiICsgb3BlcmF0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGFyZ3VtZW50Lmhhc1N0YXRpY1ZhbHVlKCkpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0U3RhdGljVmFsdWUoZnVuYyhhcmd1bWVudC5nZXRTdGF0aWNWYWx1ZSgpKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXREeW5hbWljVmFsdWUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9LFxuXG5cbiAgICAgICAgSWRlbnRpZmllcjogZnVuY3Rpb24gKG5vZGUsIGN0eCkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUpLFxuICAgICAgICAgICAgICAgIG5hbWUgPSBub2RlLm5hbWU7XG5cbiAgICAgICAgICAgIGlmIChuYW1lID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuVU5ERUZJTkVEKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cblxuXG4gICAgICAgIExvZ2ljYWxFeHByZXNzaW9uOiBmdW5jdGlvbiAobm9kZSwgY3R4KSB7XG4gICAgICAgICAgICB2YXIgbGVmdCA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLmxlZnQpLFxuICAgICAgICAgICAgICAgIHJpZ2h0ID0gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUucmlnaHQpLFxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUpLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yID0gbm9kZS5vcGVyYXRvcjtcblxuICAgICAgICAgICAgaWYgKCEob3BlcmF0b3IgPT0gXCImJlwiIHx8IG9wZXJhdG9yID09IFwifHxcIikpXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT3BlcmF0b3Igbm90IHN1cHBvcnRlZDogXCIgKyBub2RlLm9wZXJhdG9yKTtcblxuICAgICAgICAgICAgaWYgKGxlZnQuaXNOdWxsT3JVbmRlZmluZWQoKSkgeyAgLy8gZXZhbHVhdGVzIHRvIGZhbHNlXG4gICAgICAgICAgICAgICAgaWYgKG9wZXJhdG9yID09IFwifHxcIikgeyAgICAgIC8vIGZhbHNlIHx8IHggPSB4XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5jb3B5KHJpZ2h0KTtcbiAgICAgICAgICAgICAgICAgICAgbGVmdC5lbGltaW5hdGUoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAgICAgICAgICAgICAgICAgICAgIC8vIGZhbHNlICYmIHggPSBmYWxzZVxuICAgICAgICAgICAgICAgICAgICByZXN1bHQuY29weShsZWZ0KTtcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQuZWxpbWluYXRlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChsZWZ0LmlzT2JqZWN0KCkgJiYgb3BlcmF0b3IgPT0gXCJ8fFwiKSB7IC8vIEFuIG9iamVjdCB0aGF0IGlzIG5vdCBudWxsIGV2YWx1YXRlcyB0byB0cnVlXG4gICAgICAgICAgICAgICAgcmVzdWx0LmNvcHkobGVmdCk7XG4gICAgICAgICAgICAgICAgcmlnaHQuZWxpbWluYXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChsZWZ0LmdldFR5cGUoKSA9PSByaWdodC5nZXRUeXBlKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAobGVmdC5pc09iamVjdCgpICYmIGxlZnQuZ2V0S2luZCgpICE9IHJpZ2h0LmdldEtpbmQoKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBldmFsdWF0ZSBsb2dpY2FsIGV4cHJlc3Npb24gd2l0aCB0d28gZGlmZmVyZW50IGtpbmQgb2Ygb2JqZWN0c1wiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzdWx0LmNvcHkobGVmdCk7IC8vIFRPRE86IFN0YXRpYyB2YWx1ZT9cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFdlIGRvbid0IGFsbG93IGR5bmFtaWMgdHlwZXMgKHRoZSB0eXBlIG9mIHRoZSByZXN1bHQgZGVwZW5kcyBvbiB0aGUgdmFsdWUgb2YgaXQncyBvcGVyYW5kcykuXG4gICAgICAgICAgICAgICAgLy8gQXQgdGhpcyBwb2ludCwgdGhlIGV4cHJlc3Npb24gbmVlZHMgdG8gZXZhbHVhdGUgdG8gYSByZXN1bHQsIG90aGVyd2lzZSBpdCdzIGFuIGVycm9yXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU3RhdGljIGV2YWx1YXRpb24gbm90IGltcGxlbWVudGVkIHlldFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuXG4gICAgICAgIEJpbmFyeUV4cHJlc3Npb246IGZ1bmN0aW9uIChub2RlLCBjdHgpIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2cobm9kZS5sZWZ0LCBub2RlLnJpZ2h0KTtcbiAgICAgICAgICAgIHZhciBsZWZ0ID0gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUubGVmdCksXG4gICAgICAgICAgICAgICAgcmlnaHQgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZS5yaWdodCksXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obm9kZSksXG4gICAgICAgICAgICAgICAgb3BlcmF0b3IgPSBub2RlLm9wZXJhdG9yLFxuICAgICAgICAgICAgICAgIGZ1bmMgPSBCaW5hcnlGdW5jdGlvbnNbb3BlcmF0b3JdO1xuXG4gICAgICAgICAgICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBcIitcIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwiLVwiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCIqXCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcIi9cIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwiJVwiOlxuICAgICAgICAgICAgICAgICAgICAvLyBpbnQgJ29wJyBpbnQgPT4gaW50XG4gICAgICAgICAgICAgICAgICAgIC8vIGludCAvIGludCA9PiBudW1iZXJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxlZnQuaXNJbnQoKSAmJiByaWdodC5pc0ludCgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob3BlcmF0b3IgPT0gXCIvXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuTlVNQkVSKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5JTlQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIGludCAnb3AnIG51bWJlciA9PiBudW1iZXJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAobGVmdC5pc0ludCgpICYmIHJpZ2h0LmlzTnVtYmVyKCkgfHwgcmlnaHQuaXNJbnQoKSAmJiBsZWZ0LmlzTnVtYmVyKCkpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5OVU1CRVIpO1xuICAgICAgICAgICAgICAgICAgICAvLyBudW1iZXIgJ29wJyBudW1iZXIgPT4gbnVtYmVyXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGxlZnQuaXNOdW1iZXIoKSAmJiByaWdodC5pc051bWJlcigpKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuTlVNQkVSKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gaW50ICdvcCcgbnVsbCA9PiBpbnRcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAobGVmdC5pc0ludCgpICYmIHJpZ2h0LmlzTnVsbE9yVW5kZWZpbmVkKCkgfHwgcmlnaHQuaXNJbnQoKSAmJiBsZWZ0LmlzTnVsbE9yVW5kZWZpbmVkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLklOVCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gbnVtYmVyICdvcCcgbnVsbCA9PiBudW1iZXJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoKGxlZnQuaXNOdW1iZXIoKSAmJiByaWdodC5pc051bGxPclVuZGVmaW5lZCgpKSB8fCAocmlnaHQuaXNOdW1iZXIoKSAmJiBsZWZ0LmlzTnVsbE9yVW5kZWZpbmVkKCkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5OVU1CRVIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmVycm9yKG5vZGUsIGxlZnQuZ2V0VHlwZSgpLCBvcGVyYXRvciwgcmlnaHQuZ2V0VHlwZSgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJFdmFsdWF0ZXMgdG8gTmFOOiBcIiArIGxlZnQuZ2V0VHlwZVN0cmluZygpICsgXCIgXCIgKyBvcGVyYXRvciArIFwiIFwiICsgcmlnaHQuZ2V0VHlwZVN0cmluZygpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiPT1cIjogLy8gY29tcGFyaXNvblxuICAgICAgICAgICAgICAgIGNhc2UgXCIhPVwiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCI9PT1cIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwiIT09XCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcIj5cIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwiPFwiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCI+PVwiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCI8PVwiOlxuICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5CT09MRUFOKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT3BlcmF0b3Igbm90IHN1cHBvcnRlZDogXCIgKyBvcGVyYXRvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobGVmdC5oYXNTdGF0aWNWYWx1ZSgpICYmIHJpZ2h0Lmhhc1N0YXRpY1ZhbHVlKCkpIHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKGxlZnQuZ2V0U3RhdGljVmFsdWUoKSwgb3BlcmF0b3IsIHJpZ2h0LmdldFN0YXRpY1ZhbHVlKCkpO1xuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRTdGF0aWNWYWx1ZShmdW5jKGxlZnQuZ2V0U3RhdGljVmFsdWUoKSwgcmlnaHQuZ2V0U3RhdGljVmFsdWUoKSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0RHluYW1pY1ZhbHVlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSxcblxuXG4gICAgICAgIE1lbWJlckV4cHJlc3Npb246IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQsIGN0eCwgcm9vdCkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdFR5cGUgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZSksXG4gICAgICAgICAgICAgICAgb2JqZWN0QW5ub3RhdGlvbiA9IG5ldyBBbm5vdGF0aW9uKG5vZGUub2JqZWN0KSxcbiAgICAgICAgICAgICAgICBwcm9wZXJ0eUFubm90YXRpb24gPSBuZXcgQW5ub3RhdGlvbihub2RlLnByb3BlcnR5KSxcbiAgICAgICAgICAgICAgICBwcm9wZXJ0eU5hbWUgPSBub2RlLnByb3BlcnR5Lm5hbWU7XG5cbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJNZW1iZXJcIiwgbm9kZS5vYmplY3QubmFtZSwgbm9kZS5wcm9wZXJ0eS5uYW1lKTtcbiAgICAgICAgICAgIGlmIChub2RlLmNvbXB1dGVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdEFubm90YXRpb24uaXNBcnJheSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFByb3BlcnR5IGlzIGNvbXB1dGVkLCB0aHVzIGl0IGNvdWxkIGJlIGEgdmFyaWFibGVcbiAgICAgICAgICAgICAgICAgICAgdmFyIHByb3BlcnR5VHlwZSA9ICBjdHguY3JlYXRlVHlwZUluZm8obm9kZS5wcm9wZXJ0eSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcHJvcGVydHlUeXBlLmNhbkludCgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKG5vZGUsIFwiRXhwZWN0ZWQgJ2ludCcgdHlwZSBmb3IgYXJyYXkgYWNjZXNzb3JcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdmFyIGVsZW1lbnRJbmZvID0gb2JqZWN0QW5ub3RhdGlvbi5nZXRBcnJheUVsZW1lbnRUeXBlKCk7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdFR5cGUuc2V0VHlwZShlbGVtZW50SW5mby50eXBlLCBlbGVtZW50SW5mby5raW5kKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIlR5cGVFcnJvcjogQ2Fubm90IHJlYWQgcHJvcGVydHkgJ1wiKyBwcm9wZXJ0eU5hbWUgKyBcIicgb2YgXCIgKyBvYmplY3RBbm5vdGF0aW9uLmdldFR5cGVTdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgb2JqZWN0T2ZJbnRlcmVzdCA9IGdldE9iamVjdFJlZmVyZW5jZUZyb21Ob2RlKG5vZGUub2JqZWN0LCBjdHgpO1xuXG4gICAgICAgICAgICBvYmplY3RPZkludGVyZXN0IHx8IFNoYWRlLnRocm93RXJyb3Iobm9kZSxcIlJlZmVyZW5jZUVycm9yOiBcIiArIG5vZGUub2JqZWN0Lm5hbWUgKyBcIiBpcyBub3QgZGVmaW5lZC4gQ29udGV4dDogXCIgKyBjdHguc3RyKCkpO1xuXG4gICAgICAgICAgICBpZiAob2JqZWN0T2ZJbnRlcmVzdC5nZXRUeXBlKCkgPT0gVFlQRVMuVU5ERUZJTkVEKSB7ICAvLyBlLmcuIHZhciBhID0gdW5kZWZpbmVkOyBhLnVua25vd247XG4gICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIlR5cGVFcnJvcjogQ2Fubm90IHJlYWQgcHJvcGVydHkgJ1wiKyBwcm9wZXJ0eU5hbWUgK1wiJyBvZiB1bmRlZmluZWRcIilcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvYmplY3RPZkludGVyZXN0LmdldFR5cGUoKSAhPSBUWVBFUy5PQkpFQ1QpIHsgLy8gZS5nLiB2YXIgYSA9IDU7IGEudW5rbm93bjtcbiAgICAgICAgICAgICAgICByZXN1bHRUeXBlLnNldFR5cGUoVFlQRVMuVU5ERUZJTkVEKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBvYmplY3RJbmZvID0gY3R4LmdldE9iamVjdEluZm9Gb3Iob2JqZWN0T2ZJbnRlcmVzdCk7XG4gICAgICAgICAgICBpZighb2JqZWN0SW5mbylcbiAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKG5vZGUsIFwiSW50ZXJuYWw6IEluY29tcGxldGUgcmVnaXN0cmF0aW9uIGZvciBvYmplY3Q6IFwiICsgb2JqZWN0T2ZJbnRlcmVzdC5nZXRUeXBlU3RyaW5nKCkgKyBcIiwgXCIgKyBKU09OLnN0cmluZ2lmeShub2RlLm9iamVjdCkpO1xuXG4gICAgICAgICAgICBvYmplY3RBbm5vdGF0aW9uLmNvcHkob2JqZWN0T2ZJbnRlcmVzdCk7XG4gICAgICAgICAgICBpZiAoIW9iamVjdEluZm8uaGFzT3duUHJvcGVydHkocHJvcGVydHlOYW1lKSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdFR5cGUuc2V0VHlwZShUWVBFUy5VTkRFRklORUQpO1xuICAgICAgICAgICAgICAgIHByb3BlcnR5QW5ub3RhdGlvbi5zZXRUeXBlKFRZUEVTLlVOREVGSU5FRCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgcHJvcGVydHlUeXBlSW5mbyA9IG9iamVjdEluZm9bcHJvcGVydHlOYW1lXTtcbiAgICAgICAgICAgIHJlc3VsdFR5cGUuc2V0RnJvbUV4dHJhKHByb3BlcnR5VHlwZUluZm8pO1xuICAgICAgICB9LFxuXG4gICAgICAgIENhbGxFeHByZXNzaW9uOiBmdW5jdGlvbiAobm9kZSwgY3R4LCByb290KSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obm9kZSk7XG5cbiAgICAgICAgICAgIC8vIENhbGwgb24gYW4gb2JqZWN0LCBlLmcuIE1hdGguY29zKClcbiAgICAgICAgICAgIGlmIChub2RlLmNhbGxlZS50eXBlID09IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNhbGxpbmdPYmplY3QgPSBnZXRPYmplY3RSZWZlcmVuY2VGcm9tTm9kZShub2RlLmNhbGxlZSwgY3R4KTtcblxuICAgICAgICAgICAgICAgIGlmICghY2FsbGluZ09iamVjdC5pc0Z1bmN0aW9uKCkpIHsgLy8gZS5nLiBNYXRoLlBJKClcbiAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIlR5cGVFcnJvcjogT2JqZWN0ICM8XCIgKyBjYWxsaW5nT2JqZWN0LmdldFR5cGUoKSsgXCI+IGhhcyBubyBtZXRob2QgJ1wiKyBub2RlLmNhbGxlZS5wcm9wZXJ0eS5uYW1lICsgXCInXCIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBvYmplY3QgPSBub2RlLmNhbGxlZS5vYmplY3QsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5TmFtZSA9IG5vZGUuY2FsbGVlLnByb3BlcnR5Lm5hbWU7XG5cbiAgICAgICAgICAgICAgICB2YXIgb2JqZWN0UmVmZXJlbmNlID0gZ2V0T2JqZWN0UmVmZXJlbmNlRnJvbU5vZGUob2JqZWN0LCBjdHgpO1xuICAgICAgICAgICAgICAgIGlmKCFvYmplY3RSZWZlcmVuY2UpICB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJObyBvYmplY3QgaW5mbyBmb3I6IFwiLCBvYmplY3QpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIG9iamVjdEluZm8gPSBjdHguZ2V0T2JqZWN0SW5mb0ZvcihvYmplY3RSZWZlcmVuY2UpO1xuICAgICAgICAgICAgICAgIGlmKCFvYmplY3RJbmZvKSB7IC8vIEV2ZXJ5IG9iamVjdCBuZWVkcyBhbiBpbmZvLCBvdGhlcndpc2Ugd2UgZGlkIHNvbWV0aGluZyB3cm9uZ1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiTm8gb2JqZWN0IHJlZ2lzdGVyZWQgZm9yOiBcIiwgb2JqZWN0UmVmZXJlbmNlLmdldFR5cGVTdHJpbmcoKSwgSlNPTi5zdHJpbmdpZnkobm9kZS5vYmplY3QpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0SW5mby5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwcm9wZXJ0eUhhbmRsZXIgPSBvYmplY3RJbmZvW3Byb3BlcnR5TmFtZV07XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcHJvcGVydHlIYW5kbGVyLmV2YWx1YXRlID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBbm5vdGF0aW9uLmNyZWF0ZUFubm90YXRlZE5vZGVBcnJheShub2RlLmFyZ3VtZW50cywgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBleHRyYSA9IHByb3BlcnR5SGFuZGxlci5ldmFsdWF0ZShyZXN1bHQsIGFyZ3MsIGN0eCwgb2JqZWN0UmVmZXJlbmNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRGcm9tRXh0cmEoZXh0cmEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSAgZWxzZSBpZiAobm9kZS5jYWxsZWUudHlwZSA9PSBTeW50YXguSWRlbnRpZmllcikge1xuICAgICAgICAgICAgICAgIHZhciBmdW5jdGlvbk5hbWUgPSBub2RlLmNhbGxlZS5uYW1lO1xuICAgICAgICAgICAgICAgIHZhciBmdW5jID0gY3R4LmdldEJpbmRpbmdCeU5hbWUoZnVuY3Rpb25OYW1lKTtcbiAgICAgICAgICAgICAgICBpZiAoIWZ1bmMpIHtcbiAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIlJlZmVyZW5jZUVycm9yOiBcIiArIGZ1bmN0aW9uTmFtZSArIFwiIGlzIG5vdCBkZWZpbmVkXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZighZnVuYy5pc0Z1bmN0aW9uKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIlR5cGVFcnJvcjogXCIgKyBmdW5jLmdldFR5cGVTdHJpbmcoKSArIFwiIGlzIG5vdCBhIGZ1bmN0aW9uXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IEFubm90YXRpb24uY3JlYXRlQW5ub3RhdGVkTm9kZUFycmF5KG5vZGUuYXJndW1lbnRzLCBjdHgpO1xuICAgICAgICAgICAgICAgIHZhciBkZWZpbmluZ0NvbnRleHQgPSBjdHguZ2V0Q29udGV4dEZvck5hbWUoZnVuY3Rpb25OYW1lKTtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHZhciBleHRyYSA9IHJvb3QuZ2V0RnVuY3Rpb25JbmZvcm1hdGlvbkZvcihjdHguZ2V0VmFyaWFibGVJZGVudGlmaWVyKGZ1bmN0aW9uTmFtZSksIGFyZ3MsIGRlZmluaW5nQ29udGV4dCk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJGYWlsdXJlIGluIGZ1bmN0aW9uIGNhbGw6IFwiICsgZS5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXh0cmEgJiYgcmVzdWx0LnNldEZyb21FeHRyYShleHRyYSk7XG4gICAgICAgICAgICAgICAgbm9kZS5jYWxsZWUubmFtZSA9IGV4dHJhLm5ld05hbWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLypjYXNlIFN5bnRheC5JZGVudGlmaWVyOlxuICAgICAgICAgICAgICAgICAgICB2YXIgZnVuY3Rpb25OYW1lID0gbm9kZS5jYWxsZWUubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZ1bmMgPSBjdHguZ2V0QmluZGluZ0J5TmFtZShmdW5jdGlvbk5hbWUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIShmdW5jICYmIGZ1bmMuaXNJbml0aWFsaXplZCgpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGZ1bmN0aW9uTmFtZSArIFwiIGlzIG5vdCBkZWZpbmVkLiBDb250ZXh0OiBcIiArIGN0eC5zdHIoKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZnVuYyk7XG4gICAgICAgICAgICAgICAgICAgIC8vdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgY2FsbCBcIiArIGZ1bmN0aW9uTmFtZSArIFwiKCkgaW4gdGhpcyBjb250ZXh0OiBcIiArIGN0eC5zdHIoKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICAgKi9cbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuaGFuZGxlZCBDYWxsRXhwcmVzc2lvbjpcIiArIG5vZGUuY2FsbGVlLnR5cGUpO1xuXG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGVudGVyRXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQsIGN0eCkge1xuICAgICAgICBpZiAoZW50ZXJIYW5kbGVycy5oYXNPd25Qcm9wZXJ0eShub2RlLnR5cGUpKSB7XG4gICAgICAgICAgICByZXR1cm4gZW50ZXJIYW5kbGVyc1tub2RlLnR5cGVdKG5vZGUsIHBhcmVudCwgY3R4LCB0aGlzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgZXhpdEV4cHJlc3Npb24gPSBmdW5jdGlvbiAobm9kZSwgcGFyZW50LCBjdHgpIHtcblxuICAgICAgICBzd2l0Y2ggKG5vZGUudHlwZSkge1xuICAgICAgICAgICAgY2FzZSBTeW50YXguQXNzaWdubWVudEV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgaGFuZGxlcnMuQXNzaWdubWVudEV4cHJlc3Npb24obm9kZSwgY3R4KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkFycmF5RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguQXJyYXlQYXR0ZXJuOlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5CaW5hcnlFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLkJpbmFyeUV4cHJlc3Npb24obm9kZSwgY3R4KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkNhbGxFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLkNhbGxFeHByZXNzaW9uKG5vZGUsIGN0eCwgdGhpcyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Db25kaXRpb25hbEV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5GdW5jdGlvbkV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LklkZW50aWZpZXI6XG4gICAgICAgICAgICAgICAgaGFuZGxlcnMuSWRlbnRpZmllcihub2RlLCBjdHgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguTGl0ZXJhbDpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkxvZ2ljYWxFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLkxvZ2ljYWxFeHByZXNzaW9uKG5vZGUsIGN0eCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5NZW1iZXJFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLk1lbWJlckV4cHJlc3Npb24obm9kZSwgcGFyZW50LCBjdHgsIHRoaXMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguTmV3RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBoYW5kbGVycy5OZXdFeHByZXNzaW9uKG5vZGUsIHBhcmVudCwgY3R4KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk9iamVjdEV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk9iamVjdFBhdHRlcm46XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlByb3BlcnR5OlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5TZXF1ZW5jZUV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlRoaXNFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguVW5hcnlFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLlVuYXJ5RXhwcmVzc2lvbihub2RlLCBjdHgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguVXBkYXRlRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguWWllbGRFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBub2RlIHR5cGU6ICcgKyBub2RlLnR5cGUpO1xuXG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxuXG4gICAgbnMuZW50ZXJFeHByZXNzaW9uID0gZW50ZXJFeHByZXNzaW9uO1xuICAgIG5zLmV4aXRFeHByZXNzaW9uID0gZXhpdEV4cHJlc3Npb247XG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbiAobnMpIHtcblxuICAgIHZhciB3YWxrID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLFxuICAgICAgICBlbnRlckV4cHJlc3Npb24gPSByZXF1aXJlKCcuL2luZmVyX2V4cHJlc3Npb24uanMnKS5lbnRlckV4cHJlc3Npb24sXG4gICAgICAgIGV4aXRFeHByZXNzaW9uID0gcmVxdWlyZSgnLi9pbmZlcl9leHByZXNzaW9uLmpzJykuZXhpdEV4cHJlc3Npb24sXG4gICAgICAgIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXgsXG4gICAgICAgIFRZUEVTID0gcmVxdWlyZShcIi4uLy4uL2ludGVyZmFjZXMuanNcIikuVFlQRVMsXG4gICAgICAgIEFubm90YXRpb24gPSByZXF1aXJlKFwiLi8uLi8uLi9iYXNlL2Fubm90YXRpb24uanNcIikuQW5ub3RhdGlvbixcbiAgICAgICAgRnVuY3Rpb25Bbm5vdGF0aW9uID0gcmVxdWlyZShcIi4vLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkZ1bmN0aW9uQW5ub3RhdGlvbjtcblxuICAgIHZhciBsb2cgPSBmdW5jdGlvbihzdHIpIHt9O1xuICAgIC8vdmFyIGxvZyA9IGZ1bmN0aW9uKCkgeyBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpOyB9O1xuXG4gICAgdmFyIGVudGVySGFuZGxlciA9IHtcbiAgICAgICAgRm9yU3RhdGVtZW50OiBmdW5jdGlvbihub2RlLCBjdHgsIHJvb3QpIHtcbiAgICAgICAgICAgIHZhciBjdHggPSByb290LmNyZWF0ZUNvbnRleHQobm9kZSwgY3R4KTtcbiAgICAgICAgICAgIHJvb3QucHVzaENvbnRleHQoY3R4KTtcblxuICAgICAgICAgICAgcm9vdC50cmF2ZXJzZShub2RlLmluaXQpO1xuICAgICAgICAgICAgcm9vdC50cmF2ZXJzZShub2RlLnRlc3QpO1xuXG4gICAgICAgICAgICB2YXIgdGVzdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUudGVzdCk7XG4gICAgICAgICAgICBpZiAodGVzdC5oYXNTdGF0aWNWYWx1ZSgpKSB7IC8vIEdyZWF0ISBXZSBjYW4gZXZhbHVhdGUgaXQhXG4gICAgICAgICAgICAgICAgLy8gVE9ET1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByb290LnRyYXZlcnNlKG5vZGUudXBkYXRlKTtcbiAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS5ib2R5KTtcbiAgICAgICAgICAgIHJvb3QucG9wQ29udGV4dCgpO1xuICAgICAgICAgICAgcmV0dXJuIHdhbGsuVmlzaXRvck9wdGlvbi5Ta2lwO1xuICAgICAgICB9LFxuXG4gICAgICAgIElmU3RhdGVtZW50OiAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIHZhciBjX2V2YWx1YXRlID0gZnVuY3Rpb24oZXhwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICEhZXhwO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24obm9kZSwgY3R4LCByb290KSB7XG4gICAgICAgICAgICAgICAgcm9vdC50cmF2ZXJzZShub2RlLnRlc3QpO1xuICAgICAgICAgICAgICAgIHZhciB0ZXN0ID0gbmV3IEFubm90YXRpb24obm9kZS50ZXN0KTtcbiAgICAgICAgICAgICAgICBpZiAodGVzdC5oYXNTdGF0aWNWYWx1ZSgpKSB7IC8vIEdyZWF0ISBXZSBjYW4gZXZhbHVhdGUgaXQhXG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJTdGF0aWMgdmFsdWUgaW4gaWYgdGVzdCFcIik7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0ZXN0UmVzdWx0ID0gY19ldmFsdWF0ZSh0ZXN0LmdldFN0YXRpY1ZhbHVlKCkpO1xuICAgICAgICAgICAgICAgICAgICBpZighdGVzdFJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUuYWx0ZXJuYXRlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS5hbHRlcm5hdGUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29uc2VxdWVudCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUuY29uc2VxdWVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zZXF1ZW50LmVsaW1pbmF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcm9vdC50cmF2ZXJzZShub2RlLmNvbnNlcXVlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYobm9kZS5hbHRlcm5hdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgYWx0ZXJuYXRlID0gbmV3IEFubm90YXRpb24obm9kZS5hbHRlcm5hdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsdGVybmF0ZS5lbGltaW5hdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gd2Fsay5WaXNpdG9yT3B0aW9uLlNraXA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KCkpLFxuXG4gICAgICAgIFZhcmlhYmxlRGVjbGFyYXRpb246IGZ1bmN0aW9uKG5vZGUsIGN0eCkge1xuICAgICAgICAgICAgY3R4LmluRGVjbGFyYXRpb24gPSB0cnVlO1xuICAgICAgICB9LFxuXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBub2RlXG4gICAgICAgICAqIEBwYXJhbSB7Q29udGV4dH0gcGFyZW50Q29udGV4dFxuICAgICAgICAgKiBAcGFyYW0ge1R5cGVJbmZlcmVuY2V9IHJvb3RcbiAgICAgICAgICovXG4gICAgICAgIEZ1bmN0aW9uRGVjbGFyYXRpb246IGZ1bmN0aW9uKG5vZGUsIHBhcmVudENvbnRleHQsIHJvb3QpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgRnVuY3Rpb25Bbm5vdGF0aW9uKG5vZGUpO1xuXG4gICAgICAgICAgICBpZiAobm9kZS5pZC50eXBlICE9IFN5bnRheC5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRHluYW1pYyB2YXJpYWJsZSBuYW1lcyBhcmUgbm90IHlldCBzdXBwb3J0ZWRcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgZnVuY3Rpb25OYW1lID0gbm9kZS5pZC5uYW1lO1xuICAgICAgICAgICAgdmFyIGZ1bmN0aW9uQ29udGV4dCA9IHJvb3QuY3JlYXRlQ29udGV4dChub2RlLCBwYXJlbnRDb250ZXh0LCBmdW5jdGlvbk5hbWUpO1xuICAgICAgICAgICAgZnVuY3Rpb25Db250ZXh0LmRlY2xhcmVQYXJhbWV0ZXJzKG5vZGUucGFyYW1zKTtcbiAgICAgICAgICAgIHJvb3QucHVzaENvbnRleHQoZnVuY3Rpb25Db250ZXh0KTtcbiAgICAgICAgICAgIGlmKGZ1bmN0aW9uQ29udGV4dC5zdHIoKSAhPSByb290LmVudHJ5UG9pbnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gd2Fsay5WaXNpdG9yT3B0aW9uLlNraXA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgZXhpdEhhbmRsZXIgPSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0gbm9kZVxuICAgICAgICAgKiBAcGFyYW0ge0NvbnRleHR9IGN0eFxuICAgICAgICAgKiBAcGFyYW0ge1R5cGVJbmZlcmVuY2V9IHJvb3RcbiAgICAgICAgICovXG4gICAgICAgIEZ1bmN0aW9uRGVjbGFyYXRpb246IGZ1bmN0aW9uKG5vZGUsIGN0eCwgcm9vdCkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBGdW5jdGlvbkFubm90YXRpb24obm9kZSk7XG4gICAgICAgICAgICB2YXIgcmV0dXJuSW5mbyA9IGN0eC5nZXRSZXR1cm5JbmZvKCk7XG4gICAgICAgICAgICByZXN1bHQuc2V0UmV0dXJuSW5mbyhyZXR1cm5JbmZvIHx8IHsgdHlwZTogVFlQRVMuVU5ERUZJTkVEIH0pO1xuICAgICAgICAgICAgcm9vdC5wb3BDb250ZXh0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIFZhcmlhYmxlRGVjbGFyYXRpb246IGZ1bmN0aW9uKG5vZGUsIGN0eCkge1xuICAgICAgICAgICAgY3R4LmluRGVjbGFyYXRpb24gPSBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdG9yOiBmdW5jdGlvbihub2RlLCBjdHgpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihub2RlKTtcblxuICAgICAgICAgICAgaWYgKG5vZGUuaWQudHlwZSAhPSBTeW50YXguSWRlbnRpZmllcikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkR5bmFtaWMgdmFyaWFibGUgbmFtZXMgYXJlIG5vdCB5ZXQgc3VwcG9ydGVkXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHZhcmlhYmxlTmFtZSA9IG5vZGUuaWQubmFtZTtcbiAgICAgICAgICAgIGN0eC5kZWNsYXJlVmFyaWFibGUodmFyaWFibGVOYW1lLCB0cnVlLCByZXN1bHQpO1xuXG4gICAgICAgICAgICBpZiAobm9kZS5pbml0KSB7XG4gICAgICAgICAgICAgICAgdmFyIGluaXQgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZS5pbml0KTtcbiAgICAgICAgICAgICAgICByZXN1bHQuY29weShpbml0KTtcbiAgICAgICAgICAgICAgICBjdHgudXBkYXRlRXhwcmVzc2lvbih2YXJpYWJsZU5hbWUsIGluaXQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5VTkRFRklORUQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gVE9ETzogcmVzdWx0LnNldFR5cGUoaW5pdC5nZXRUeXBlKCkpO1xuICAgICAgICB9LFxuICAgICAgICBSZXR1cm5TdGF0ZW1lbnQ6IGZ1bmN0aW9uKG5vZGUsIHBhcmVudCwgY3R4KSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obm9kZSksXG4gICAgICAgICAgICAgICAgYXJndW1lbnQgPSBub2RlLmFyZ3VtZW50ID8gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUuYXJndW1lbnQpIDogbnVsbDtcblxuICAgICAgICAgICAgaWYgKGFyZ3VtZW50KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmNvcHkoYXJndW1lbnQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5VTkRFRklORUQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY3R4LnVwZGF0ZVJldHVybkluZm8ocmVzdWx0KTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG5cblxuXG4gICAgdmFyIGVudGVyU3RhdGVtZW50ID0gZnVuY3Rpb24gKG5vZGUsIHBhcmVudCwgY3R4KSB7XG4gICAgICAgIHN3aXRjaCAobm9kZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Gb3JTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVudGVySGFuZGxlci5Gb3JTdGF0ZW1lbnQobm9kZSwgY3R4LCB0aGlzKTtcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LklmU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIHJldHVybiBlbnRlckhhbmRsZXIuSWZTdGF0ZW1lbnQobm9kZSwgY3R4LCB0aGlzKTtcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlZhcmlhYmxlRGVjbGFyYXRpb246XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVudGVySGFuZGxlci5WYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUsIGN0eCk7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxuICAgICAgICAgICAgICAgIHJldHVybiBlbnRlckhhbmRsZXIuRnVuY3Rpb25EZWNsYXJhdGlvbihub2RlLCBjdHgsIHRoaXMpO1xuXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuXG5cbiAgICB9O1xuXG4gICAgdmFyIGV4aXRTdGF0ZW1lbnQgPSBmdW5jdGlvbiAobm9kZSwgcGFyZW50LCBjdHgpIHtcblxuICAgICAgICBzd2l0Y2ggKG5vZGUudHlwZSkge1xuICAgICAgICAgICAgY2FzZSBTeW50YXguRXhwcmVzc2lvblN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obm9kZSksXG4gICAgICAgICAgICAgICAgICAgIGV4cHJlc3Npb24gPSBuZXcgQW5ub3RhdGlvbihub2RlLmV4cHJlc3Npb24pO1xuXG4gICAgICAgICAgICAgICAgcmVzdWx0LmNvcHkoZXhwcmVzc2lvbik7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkJsb2NrU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5CcmVha1N0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguQ2F0Y2hDbGF1c2U6XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkNvbnRpbnVlU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5EaXJlY3RpdmVTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkRvV2hpbGVTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkRlYnVnZ2VyU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5FbXB0eVN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguRm9yU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Gb3JJblN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbjpcbiAgICAgICAgICAgICAgICByZXR1cm4gZXhpdEhhbmRsZXIuRnVuY3Rpb25EZWNsYXJhdGlvbihub2RlLCBjdHgsIHRoaXMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguSWZTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5MYWJlbGVkU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Qcm9ncmFtOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguUmV0dXJuU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIHJldHVybiBleGl0SGFuZGxlci5SZXR1cm5TdGF0ZW1lbnQobm9kZSwgcGFyZW50LCBjdHgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguU3dpdGNoU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Td2l0Y2hDYXNlOlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5UaHJvd1N0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguVHJ5U3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5WYXJpYWJsZURlY2xhcmF0aW9uOlxuICAgICAgICAgICAgICAgIHJldHVybiBleGl0SGFuZGxlci5WYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUsIGN0eCk7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5WYXJpYWJsZURlY2xhcmF0b3I6XG4gICAgICAgICAgICAgICAgZXhpdEhhbmRsZXIuVmFyaWFibGVEZWNsYXJhdG9yKG5vZGUsIGN0eCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5XaGlsZVN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguV2l0aFN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gbm9kZSB0eXBlOiAnICsgbm9kZS50eXBlKTtcbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIG5zLmVudGVyU3RhdGVtZW50ID0gZW50ZXJTdGF0ZW1lbnQ7XG4gICAgbnMuZXhpdFN0YXRlbWVudCA9IGV4aXRTdGF0ZW1lbnQ7XG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucyl7XG5cbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgVFlQRVMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFMsXG4gICAgICAgIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XG5cbiAgICB2YXIgQ29sb3JDbG9zdXJlSW5zdGFuY2UgPSB7XG4gICAgICAgIG11bHRpcGx5OiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcbiAgICAgICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5PQkpFQ1QsXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IEtJTkRTLkNPTE9SX0NMT1NVUkVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBhZGQ6IHtcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxuICAgICAgICAgICAgZXZhbHVhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRZUEVTLk9CSkVDVCxcbiAgICAgICAgICAgICAgICAgICAga2luZDogS0lORFMuQ09MT1JfQ0xPU1VSRVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIkNvbG9yQ2xvc3VyZVwiLFxuICAgICAgICBraW5kOiBLSU5EUy5DT0xPUl9DTE9TVVJFLFxuICAgICAgICBvYmplY3Q6IG51bGwsXG4gICAgICAgIGluc3RhbmNlOiBDb2xvckNsb3N1cmVJbnN0YW5jZVxuICAgIH0pO1xuXG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uIChucykge1xuXG4gICAgdmFyIG9iamVjdHMgPSB7XG4gICAgICAgIFNoYWRlIDogcmVxdWlyZShcIi4vc2hhZGUuanNcIiksXG4gICAgICAgIE1hdHJpeDQgOiByZXF1aXJlKFwiLi9tYXRyaXguanNcIiksXG4gICAgICAgIE1hdGggOiByZXF1aXJlKFwiLi9tYXRoLmpzXCIpLFxuICAgICAgICBWZWMyIDogcmVxdWlyZShcIi4vdmVjMi5qc1wiKSxcbiAgICAgICAgVmVjMyA6IHJlcXVpcmUoXCIuL3ZlYzMuanNcIiksXG4gICAgICAgIENvbG9yOiByZXF1aXJlKFwiLi92ZWMzLmpzXCIpLFxuICAgICAgICBWZWM0IDogcmVxdWlyZShcIi4vdmVjNC5qc1wiKSxcbiAgICAgICAgU3lzdGVtOiByZXF1aXJlKFwiLi9zeXN0ZW0uanNcIiksXG4gICAgICAgIENvbG9yQ2xvc3VyZTogcmVxdWlyZShcIi4vY29sb3JjbG9zdXJlLmpzXCIpXG4gICAgfTtcblxuICAgIGV4cG9ydHMuUmVnaXN0cnkgPSB7XG4gICAgICAgIG5hbWU6IFwiVHlwZUluZmVyZW5jZVwiLFxuICAgICAgICBnZXRCeU5hbWU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBvYmplY3RzW25hbWVdO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCBudWxsO1xuICAgICAgICB9LFxuICAgICAgICBnZXRJbnN0YW5jZUZvcktpbmQ6IGZ1bmN0aW9uKGtpbmQpIHtcbiAgICAgICAgICAgIGZvcih2YXIgb2JqIGluIG9iamVjdHMpIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0c1tvYmpdLmtpbmQgPT0ga2luZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2JqZWN0c1tvYmpdLmluc3RhbmNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbiAobnMpIHtcblxuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpLFxuICAgICAgICBUWVBFUyA9IFNoYWRlLlRZUEVTLFxuICAgICAgICBCYXNlID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvaW5kZXguanNcIiksXG4gICAgICAgIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XG5cblxuICAgIHZhciBldmFsdWF0ZU1ldGhvZCA9IGZ1bmN0aW9uIChuYW1lLCBwYXJhbUNvdW50LCByZXR1cm5UeXBlKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge0Fubm90YXRpb259IHJlc3VsdFxuICAgICAgICAgKiBAcGFyYW0ge0FycmF5LjxBbm5vdGF0aW9uPn0gYXJnc1xuICAgICAgICAgKiBAcGFyYW0ge0NvbnRleHR9IGN0eFxuICAgICAgICAgKi9cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChyZXN1bHQsIGFyZ3MsIGN0eCkge1xuICAgICAgICAgICAgaWYgKHBhcmFtQ291bnQgIT0gLTEpIHsgLy8gQXJiaXRyYXJ5IG51bWJlciBvZiBhcmd1bWVudHNcbiAgICAgICAgICAgICAgICBpZiAoIWFyZ3MgfHwgYXJncy5sZW5ndGggIT0gcGFyYW1Db3VudCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIG51bWJlciBvZiBwYXJhbWV0ZXJzIGZvciBNYXRoLlwiICsgbmFtZSArIFwiLCBleHBlY3RlZCBcIiArIHBhcmFtQ291bnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGFyZ0FycmF5ID0gW107XG4gICAgICAgICAgICB2YXIgaXNTdGF0aWMgPSB0cnVlO1xuICAgICAgICAgICAgYXJncy5mb3JFYWNoKGZ1bmN0aW9uIChwYXJhbSwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXBhcmFtLmNhbk51bWJlcigpKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQYXJhbWV0ZXIgXCIgKyBpbmRleCArIFwiIGhhcyBpbnZhbGlkIHR5cGUgZm9yIE1hdGguXCIgKyBuYW1lICsgXCIsIGV4cGVjdGVkICdudW1iZXInLCBidXQgZ290IFwiICsgcGFyYW0uZ2V0VHlwZSgpKTtcbiAgICAgICAgICAgICAgICBpc1N0YXRpYyA9IGlzU3RhdGljICYmIHBhcmFtLmhhc1N0YXRpY1ZhbHVlKCk7XG4gICAgICAgICAgICAgICAgaWYgKGlzU3RhdGljKVxuICAgICAgICAgICAgICAgICAgICBhcmdBcnJheS5wdXNoKHBhcmFtLmdldFN0YXRpY1ZhbHVlKCkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB2YXIgdHlwZUluZm8gPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogcmV0dXJuVHlwZSB8fCBUWVBFUy5OVU1CRVJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpc1N0YXRpYykge1xuICAgICAgICAgICAgICAgIHR5cGVJbmZvLnN0YXRpY1ZhbHVlID0gTWF0aFtuYW1lXS5hcHBseSh1bmRlZmluZWQsIGFyZ0FycmF5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0eXBlSW5mbztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBNYXRoT2JqZWN0ID0ge1xuICAgICAgICByYW5kb206IHtcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxuICAgICAgICAgICAgZXZhbHVhdGU6IGZ1bmN0aW9uKG5vZGUsIGFyZ3MpIHtcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGgpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1hdGgucmFuZG9tIGhhcyBubyBwYXJhbWV0ZXJzLlwiKTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5OVU1CRVJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGFiczoge1xuICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24ocmVzdWx0LCBhcmdzKSB7XG4gICAgICAgICAgICAgICAgVG9vbHMuY2hlY2tQYXJhbUNvdW50KHJlc3VsdC5ub2RlLCBcIk1hdGguYWJzXCIsIFsxXSwgYXJncy5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIHZhciB0eXBlSW5mbyA9IHt9O1xuICAgICAgICAgICAgICAgIHN3aXRjaChhcmdzWzBdLmdldFR5cGUoKSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFRZUEVTLk5VTUJFUjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBUWVBFUy5JTlQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlSW5mby50eXBlID0gYXJnc1swXS5nZXRUeXBlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IocmVzdWx0Lm5vZGUsIFwiSW52YWxpZFR5cGUgZm9yIE1hdGguYWJzXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHlwZUluZm87XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIE1hdGhDb25zdGFudHMgPSBbXCJFXCIsIFwiUElcIiwgXCJMTjJcIiwgXCJMT0cyRVwiLCBcIkxPRzEwRVwiLCBcIlBJXCIsIFwiU1FSVDFfMlwiLCBcIlNRUlQyXCJdO1xuICAgIHZhciBPbmVQYXJhbWV0ZXJOdW1iZXJNZXRob2RzID0gW1wiYWNvc1wiLCBcImFzaW5cIiwgXCJhdGFuXCIsIFwiY29zXCIsIFwiZXhwXCIsIFwibG9nXCIsIFwicm91bmRcIiwgXCJzaW5cIiwgXCJzcXJ0XCIsIFwidGFuXCJdO1xuICAgIHZhciBPbmVQYXJhbWV0ZXJJbnRNZXRob2RzID0gW1wiY2VpbFwiLCBcImZsb29yXCJdO1xuICAgIHZhciBUd29QYXJhbWV0ZXJOdW1iZXJNZXRob2RzID0gW1wiYXRhbjJcIiwgXCJwb3dcIl07XG4gICAgdmFyIEFyYml0cmFyeVBhcmFtZXRlck51bWJlck1ldGhvZHMgPSBbXCJtYXhcIiwgXCJtaW5cIl07XG5cbiAgICBNYXRoQ29uc3RhbnRzLmZvckVhY2goZnVuY3Rpb24gKGNvbnN0YW50KSB7XG4gICAgICAgIE1hdGhPYmplY3RbY29uc3RhbnRdID0geyB0eXBlOiBUWVBFUy5OVU1CRVIsIHN0YXRpY1ZhbHVlOiBNYXRoW2NvbnN0YW50XSB9O1xuICAgIH0pO1xuXG4gICAgT25lUGFyYW1ldGVyTnVtYmVyTWV0aG9kcy5mb3JFYWNoKGZ1bmN0aW9uIChtZXRob2QpIHtcbiAgICAgICAgTWF0aE9iamVjdFttZXRob2RdID0geyB0eXBlOiBUWVBFUy5GVU5DVElPTiwgZXZhbHVhdGU6IGV2YWx1YXRlTWV0aG9kKG1ldGhvZCwgMSkgfTtcbiAgICB9KTtcblxuICAgIFR3b1BhcmFtZXRlck51bWJlck1ldGhvZHMuZm9yRWFjaChmdW5jdGlvbiAobWV0aG9kKSB7XG4gICAgICAgIE1hdGhPYmplY3RbbWV0aG9kXSA9IHsgdHlwZTogVFlQRVMuRlVOQ1RJT04sIGV2YWx1YXRlOiBldmFsdWF0ZU1ldGhvZChtZXRob2QsIDIpIH07XG4gICAgfSk7XG5cbiAgICBPbmVQYXJhbWV0ZXJJbnRNZXRob2RzLmZvckVhY2goZnVuY3Rpb24gKG1ldGhvZCkge1xuICAgICAgICBNYXRoT2JqZWN0W21ldGhvZF0gPSB7IHR5cGU6IFRZUEVTLkZVTkNUSU9OLCBldmFsdWF0ZTogZXZhbHVhdGVNZXRob2QobWV0aG9kLCAxLCBUWVBFUy5JTlQpIH07XG4gICAgfSk7XG5cbiAgICBBcmJpdHJhcnlQYXJhbWV0ZXJOdW1iZXJNZXRob2RzLmZvckVhY2goZnVuY3Rpb24gKG1ldGhvZCkge1xuICAgICAgICBNYXRoT2JqZWN0W21ldGhvZF0gPSB7IHR5cGU6IFRZUEVTLkZVTkNUSU9OLCBldmFsdWF0ZTogZXZhbHVhdGVNZXRob2QobWV0aG9kLCAtMSkgfTtcbiAgICB9KTtcblxuICAgIEJhc2UuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIk1hdGhcIixcbiAgICAgICAgb2JqZWN0OiB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogbnVsbCxcbiAgICAgICAgICAgIHN0YXRpYzogTWF0aE9iamVjdFxuICAgICAgICB9LFxuICAgICAgICBpbnN0YW5jZTogTWF0aE9iamVjdFxuICAgIH0pO1xuXG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uIChucykge1xuXG4gICAgdmFyIGludGVyZmFjZXMgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICBUb29scyA9IHJlcXVpcmUoXCIuL3Rvb2xzLmpzXCIpO1xuXG4gICAgdmFyIFRZUEVTID0gaW50ZXJmYWNlcy5UWVBFUyxcbiAgICAgICAgS0lORFMgPSBpbnRlcmZhY2VzLk9CSkVDVF9LSU5EUztcblxuICAgIHZhciBNYXRyaXhJbnN0YW5jZSA9IHtcbiAgICAgICAgdHJhbnNmb3JtUG9pbnQ6IHtcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLlVOREVGSU5FRCxcbiAgICAgICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbihyZXN1bHQsIGFyZ3MpIHtcbiAgICAgICAgICAgICAgICBUb29scy5jaGVja1BhcmFtQ291bnQocmVzdWx0Lm5vZGUsIFwiTWF0cml4Ojp0cmFuc2Zvcm1Qb2ludFwiLCBbMSwyXSwgYXJncy5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIHZhciBzb3VyY2VQb2ludCA9IHRhcmdldFBvaW50ID0gYXJnc1swXTtcbiAgICAgICAgICAgICAgICBpZiAoIShzb3VyY2VQb2ludC5pc09iamVjdCgpICYmIHNvdXJjZVBvaW50LmNhbk5vcm1hbCgpKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGaXJzdCBhcmd1bWVudCBvZiBNYXRyaXg6OnRyYW5zZm9ybVBvaW50IG11c3QgZXZhbHVhdGUgdG8gYSBwb2ludCwgZm91bmQ6IFwiICsgc291cmNlUG9pbnQuZ2V0VHlwZVN0cmluZygpKTtcbiAgICAgICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIk1hdHJpeDRcIixcbiAgICAgICAga2luZDogXCJtYXRyaXg0XCIsXG4gICAgICAgIG9iamVjdDoge1xuICAgICAgICAgICAgY29uc3RydWN0b3I6IG51bGwsXG4gICAgICAgICAgICBzdGF0aWM6IG51bGxcbiAgICAgICAgfSxcbiAgICAgICAgaW5zdGFuY2U6IE1hdHJpeEluc3RhbmNlXG4gICAgfSk7XG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uKG5zKXtcblxuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpLFxuICAgICAgICBUWVBFUyA9IFNoYWRlLlRZUEVTLFxuICAgICAgICBLSU5EUyA9IFNoYWRlLk9CSkVDVF9LSU5EUyxcbiAgICAgICAgQmFzZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9iYXNlL2luZGV4LmpzXCIpLFxuICAgICAgICBUb29scyA9IHJlcXVpcmUoXCIuL3Rvb2xzLmpzXCIpO1xuXG4gICAgdmFyIFNoYWRlT2JqZWN0ID0ge1xuICAgICAgICBkaWZmdXNlOiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcbiAgICAgICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbihyZXN1bHQsIGFyZ3MsIGN0eCkge1xuICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA8IDEpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNoYWRlLmRpZmZ1c2UgZXhwZWN0cyBhdCBsZWFzdCAxIHBhcmFtZXRlci5cIilcbiAgICAgICAgICAgICAgICB2YXIgbm9ybWFsID0gYXJnc1swXTtcbiAgICAgICAgICAgICAgICBpZighKG5vcm1hbCAmJiBub3JtYWwuY2FuTm9ybWFsKCkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZpcnN0IGFyZ3VtZW50IG9mIFNoYWRlLmRpZmZ1c2UgbXVzdCBldmFsdWF0ZSB0byBhIG5vcm1hbFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29sb3IgPSBhcmdzWzFdO1xuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiQ29sb3I6IFwiLCBjb2xvci5zdHIoKSwgY29sb3IuZ2V0VHlwZShjdHgpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoIWNvbG9yLmNhbkNvbG9yKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNlY29uZCBhcmd1bWVudCBvZiBTaGFkZS5kaWZmdXNlIG11c3QgZXZhbHVhdGUgdG8gYSBjb2xvci4gRm91bmQ6IFwiICsgY29sb3Iuc3RyKCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRZUEVTLk9CSkVDVCxcbiAgICAgICAgICAgICAgICAgICAga2luZDogS0lORFMuQ09MT1JfQ0xPU1VSRVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHBob25nOiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcbiAgICAgICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbihyZXN1bHQsIGFyZ3MsIGN0eCkge1xuICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA8IDEpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNoYWRlLnBob25nIGV4cGVjdHMgYXQgbGVhc3QgMSBwYXJhbWV0ZXIuXCIpXG4gICAgICAgICAgICAgICAgdmFyIG5vcm1hbCA9IGFyZ3NbMF07XG4gICAgICAgICAgICAgICAgaWYoIShub3JtYWwgJiYgbm9ybWFsLmNhbk5vcm1hbCgpKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGaXJzdCBhcmd1bWVudCBvZiBTaGFkZS5waG9uZyBtdXN0IGV2YWx1YXRlIHRvIGEgbm9ybWFsXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzaGluaW5lc3MgPSBhcmdzWzFdO1xuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiQ29sb3I6IFwiLCBjb2xvci5zdHIoKSwgY29sb3IuZ2V0VHlwZShjdHgpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoIXNoaW5pbmVzcy5jYW5OdW1iZXIoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2Vjb25kIGFyZ3VtZW50IG9mIFNoYWRlLnBob25nIG11c3QgZXZhbHVhdGUgdG8gYSBudW1iZXIuIEZvdW5kOiBcIiArIGNvbG9yLnN0cigpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5PQkpFQ1QsXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IEtJTkRTLkNPTE9SX0NMT1NVUkVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjbGFtcDoge1xuICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24ocmVzdWx0LCBhcmdzKSB7XG4gICAgICAgICAgICAgICAgVG9vbHMuY2hlY2tQYXJhbUNvdW50KHJlc3VsdC5ub2RlLCBcIlNoYWRlLmNsYW1wXCIsIFszXSwgYXJncy5sZW5ndGgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MuZXZlcnkoZnVuY3Rpb24oZSkgeyByZXR1cm4gZS5jYW5OdW1iZXIoKTsgfSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHR5cGVJbmZvID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuTlVNQkVSXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKFRvb2xzLmFsbEFyZ3VtZW50c0FyZVN0YXRpYyhhcmdzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNhbGxBcmdzID0gYXJncy5tYXAoZnVuY3Rpb24oYSkge3JldHVybiBhLmdldFN0YXRpY1ZhbHVlKCk7IH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZUluZm8uc3RhdGljVmFsdWUgPSBTaGFkZS5TaGFkZS5jbGFtcC5hcHBseShudWxsLCBjYWxsQXJncyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVJbmZvO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKHJlc3VsdC5ub2RlLCBcIlNoYWRlLmNsYW1wIG5vdCBzdXBwb3J0ZWQgd2l0aCBhcmd1bWVudCB0eXBlczogXCIgKyBhcmdzLm1hcChmdW5jdGlvbihhcmcpIHsgcmV0dXJuIGFyZy5nZXRUeXBlU3RyaW5nKCk7IH0pLmpvaW4oXCIsIFwiKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNtb290aHN0ZXA6IHtcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxuICAgICAgICAgICAgZXZhbHVhdGU6IGZ1bmN0aW9uKHJlc3VsdCwgYXJncywgY3R4KSB7XG4gICAgICAgICAgICAgICAgVG9vbHMuY2hlY2tQYXJhbUNvdW50KHJlc3VsdC5ub2RlLCBcIlNoYWRlLnNtb290aHN0ZXBcIiwgWzNdLCBhcmdzLmxlbmd0aCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoYXJncy5ldmVyeShmdW5jdGlvbihlKSB7IHJldHVybiBlLmNhbk51bWJlcigpOyB9KSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdHlwZUluZm8gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5OVU1CRVJcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoVG9vbHMuYWxsQXJndW1lbnRzQXJlU3RhdGljKGFyZ3MpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2FsbEFyZ3MgPSBhcmdzLm1hcChmdW5jdGlvbihhKSB7cmV0dXJuIGEuZ2V0U3RhdGljVmFsdWUoKTsgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlSW5mby5zdGF0aWNWYWx1ZSA9IFNoYWRlLlNoYWRlLnNtb290aHN0ZXAuYXBwbHkobnVsbCwgY2FsbEFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlSW5mbztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihyZXN1bHQubm9kZSwgXCJTaGFkZS5zbW9vdGhzdGVwIG5vdCBzdXBwb3J0ZWQgd2l0aCBhcmd1bWVudCB0eXBlczogXCIgKyBhcmdzLm1hcChmdW5jdGlvbihhcmcpIHsgcmV0dXJuIGFyZy5nZXRUeXBlU3RyaW5nKCk7IH0pLmpvaW4oXCIsIFwiKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHN0ZXA6IHtcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxuICAgICAgICAgICAgZXZhbHVhdGU6IGZ1bmN0aW9uKHJlc3VsdCwgYXJncywgY3R4KSB7XG4gICAgICAgICAgICAgICAgVG9vbHMuY2hlY2tQYXJhbUNvdW50KHJlc3VsdC5ub2RlLCBcIlNoYWRlLnN0ZXBcIiwgWzJdLCBhcmdzLmxlbmd0aCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoYXJncy5ldmVyeShmdW5jdGlvbihlKSB7IHJldHVybiBlLmNhbk51bWJlcigpOyB9KSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdHlwZUluZm8gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5OVU1CRVJcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoVG9vbHMuYWxsQXJndW1lbnRzQXJlU3RhdGljKGFyZ3MpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2FsbEFyZ3MgPSBhcmdzLm1hcChmdW5jdGlvbihhKSB7cmV0dXJuIGEuZ2V0U3RhdGljVmFsdWUoKTsgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlSW5mby5zdGF0aWNWYWx1ZSA9IFNoYWRlLlNoYWRlLnN0ZXAuYXBwbHkobnVsbCwgY2FsbEFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlSW5mbztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihyZXN1bHQubm9kZSwgXCJTaGFkZS5zdGVwIG5vdCBzdXBwb3J0ZWQgd2l0aCBhcmd1bWVudCB0eXBlczogXCIgKyBhcmdzLm1hcChmdW5jdGlvbihhcmcpIHsgcmV0dXJuIGFyZy5nZXRUeXBlU3RyaW5nKCk7IH0pLmpvaW4oXCIsIFwiKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGZyYWN0OiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcbiAgICAgICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbihyZXN1bHQsIGFyZ3MpIHtcbiAgICAgICAgICAgICAgICBUb29scy5jaGVja1BhcmFtQ291bnQocmVzdWx0Lm5vZGUsIFwiU2hhZGUuZnJhY3RcIiwgWzFdLCBhcmdzLmxlbmd0aCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgeCA9IGFyZ3NbMF07XG4gICAgICAgICAgICAgICAgaWYgKHguY2FuTnVtYmVyKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHR5cGVJbmZvID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuTlVNQkVSXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoeC5oYXNTdGF0aWNWYWx1ZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlSW5mby5zdGF0aWNWYWx1ZSA9IFNoYWRlLlNoYWRlLmZyYWN0KHguZ2V0U3RhdGljVmFsdWUoKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVJbmZvO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKHJlc3VsdC5ub2RlLCBcIlNoYWRlLmZyYWN0IG5vdCBzdXBwb3J0ZWQgd2l0aCBhcmd1bWVudCB0eXBlczogXCIgKyBhcmdzLm1hcChmdW5jdGlvbihhcmcpIHsgcmV0dXJuIGFyZy5nZXRUeXBlU3RyaW5nKCk7IH0pLmpvaW4oXCIsIFwiKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgQmFzZS5leHRlbmQobnMsIHtcbiAgICAgICAgaWQ6IFwiU2hhZGVcIixcbiAgICAgICAgb2JqZWN0OiB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogbnVsbCxcbiAgICAgICAgICAgIHN0YXRpYzogU2hhZGVPYmplY3RcbiAgICAgICAgfSxcbiAgICAgICAgaW5zdGFuY2U6IG51bGxcbiAgICB9KTtcblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIiksXG4gICAgICAgIFRZUEVTID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxuICAgICAgICBCYXNlID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvaW5kZXguanNcIik7XG5cbiAgICB2YXIgU3lzdGVtT2JqZWN0ID0ge1xuICAgICAgICBjb29yZHM6IHtcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLk9CSkVDVCxcbiAgICAgICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUM1xuICAgICAgICB9LFxuICAgICAgICBub3JtYWxpemVkQ29vcmRzOiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5PQkpFQ1QsXG4gICAgICAgICAgICBraW5kOiBLSU5EUy5GTE9BVDNcbiAgICAgICAgfSxcbiAgICAgICAgaGVpZ2h0OiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5JTlRcbiAgICAgICAgfSxcbiAgICAgICAgd2lkdGg6IHtcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLklOVFxuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgQmFzZS5leHRlbmQobnMsIHtcbiAgICAgICAgaWQ6IFwiU3lzdGVtXCIsXG4gICAgICAgIG9iamVjdDoge1xuICAgICAgICAgICAgY29uc3RydWN0b3I6IG51bGwsXG4gICAgICAgICAgICBzdGF0aWM6IFN5c3RlbU9iamVjdFxuICAgICAgICB9LFxuICAgICAgICBpbnN0YW5jZTogbnVsbFxuICAgIH0pO1xuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucyl7XG4gICAgdmFyIEJhc2UgPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS9pbmRleC5qc1wiKTtcbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgVFlQRVMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFMsXG4gICAgICAgIFZlY0Jhc2UgPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS92ZWMuanNcIik7XG5cbiAgICB2YXIgYWxsQXJndW1lbnRzQXJlU3RhdGljID0gZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIGFyZ3MuZXZlcnkoZnVuY3Rpb24gKGFyZykge1xuICAgICAgICAgICAgcmV0dXJuIGFyZy5oYXNTdGF0aWNWYWx1ZSgpXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIG5zLmNoZWNrUGFyYW1Db3VudCA9IGZ1bmN0aW9uKG5vZGUsIG5hbWUsIGFsbG93ZWQsIGlzKSB7XG4gICAgICAgIGlmIChhbGxvd2VkLmluZGV4T2YoaXMpID09IC0xKSB7XG4gICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKG5vZGUsIFwiSW52YWxpZCBudW1iZXIgb2YgcGFyYW1ldGVycyBmb3IgXCIgKyBuYW1lICsgXCIsIGV4cGVjdGVkIFwiICsgYWxsb3dlZC5qb2luKFwiIG9yIFwiKSArIFwiLCBmb3VuZDogXCIgKyBpcyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBucy5zaW5nbGVBY2Nlc3NvciA9IGZ1bmN0aW9uIChuYW1lLCBvYmosIHZhbGlkQXJnQ291bnRzLCBzdGF0aWNWYWx1ZUZ1bmN0aW9uKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcbiAgICAgICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbiAocmVzdWx0LCBhcmdzLCBjdHgsIGNhbGxPYmplY3QpIHtcbiAgICAgICAgICAgICAgICBucy5jaGVja1BhcmFtQ291bnQocmVzdWx0Lm5vZGUsIG5hbWUsIHZhbGlkQXJnQ291bnRzLCBhcmdzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgdmFyIHR5cGVJbmZvID0gIGFyZ3MubGVuZ3RoID8gb2JqIDogeyB0eXBlOiBUWVBFUy5OVU1CRVIgfTtcblxuICAgICAgICAgICAgICAgIGlmIChzdGF0aWNWYWx1ZUZ1bmN0aW9uICYmIGNhbGxPYmplY3QuaGFzU3RhdGljVmFsdWUoKSAmJiBhcmdzLmV2ZXJ5KGZ1bmN0aW9uKGEpIHtyZXR1cm4gYS5oYXNTdGF0aWNWYWx1ZSgpOyB9KSkge1xuICAgICAgICAgICAgICAgICAgICB0eXBlSW5mby5zdGF0aWNWYWx1ZSA9IHN0YXRpY1ZhbHVlRnVuY3Rpb24oY2FsbE9iamVjdC5nZXRTdGF0aWNWYWx1ZSgpLCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVJbmZvO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIG5zLmV4dGVuZCA9IEJhc2UuZXh0ZW5kO1xuXG4gICAgdmFyIFZlYyA9IHtcbiAgICAgICAgVFlQRVM6IHtcbiAgICAgICAgICAgIDE6IHsgdHlwZTogVFlQRVMuTlVNQkVSIH0sXG4gICAgICAgICAgICAyOiB7IHR5cGU6IFRZUEVTLk9CSkVDVCwga2luZDogS0lORFMuRkxPQVQyIH0sXG4gICAgICAgICAgICAzOiB7IHR5cGU6IFRZUEVTLk9CSkVDVCwga2luZDogS0lORFMuRkxPQVQzIH0sXG4gICAgICAgICAgICA0OiB7IHR5cGU6IFRZUEVTLk9CSkVDVCwga2luZDogS0lORFMuRkxPQVQ0IH0sXG4gICAgICAgICAgICBjb2xvcjogeyB0eXBlOiBUWVBFUy5PQkpFQ1QsIGtpbmQ6IEtJTkRTLkZMT0FUMyB9XG4gICAgICAgIH0sXG4gICAgICAgIGdldFR5cGU6IGZ1bmN0aW9uKGRlc3RWZWN0b3IsIGNvbG9yKXtcbiAgICAgICAgICAgIGlmKGRlc3RWZWN0b3IgPT0gNCAmJiBjb2xvcilcbiAgICAgICAgICAgICAgICByZXR1cm4gVmVjLlRZUEVTLmNvbG9yO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHJldHVybiBWZWMuVFlQRVNbZGVzdFZlY3Rvcl07XG4gICAgICAgIH0sXG4gICAgICAgIGdldFN0YXRpY1ZhbHVlOiBmdW5jdGlvbih0eXBlSW5mbywgbWV0aG9kTmFtZSwgYXJncywgY2FsbE9iamVjdCl7XG4gICAgICAgICAgICBpZihjYWxsT2JqZWN0Lmhhc1N0YXRpY1ZhbHVlKCkgJiYgYWxsQXJndW1lbnRzQXJlU3RhdGljKGFyZ3MpKXtcbiAgICAgICAgICAgICAgICB2YXIgb2JqZWN0ID0gY2FsbE9iamVjdC5nZXRTdGF0aWNWYWx1ZSgpO1xuICAgICAgICAgICAgICAgIHZhciBjYWxsQXJncyA9IGFyZ3MubWFwKGZ1bmN0aW9uKGEpIHtyZXR1cm4gYS5nZXRTdGF0aWNWYWx1ZSgpOyB9KTtcbiAgICAgICAgICAgICAgICB2YXIgbWV0aG9kID0gb2JqZWN0W21ldGhvZE5hbWVdO1xuICAgICAgICAgICAgICAgIGlmKG1ldGhvZClcbiAgICAgICAgICAgICAgICAgICAgdHlwZUluZm8uc3RhdGljVmFsdWUgPSBtZXRob2QuYXBwbHkob2JqZWN0LCBjYWxsQXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGNoZWNrVmVjQXJndW1lbnRzOiBmdW5jdGlvbihtZXRob2ROYW1lLCBjb2xvciwgdmVjU2l6ZSwgd2l0aEVtcHR5LCByZXN1bHQsIGFyZ3Mpe1xuICAgICAgICAgICAgd2l0aEVtcHR5ID0gKHdpdGhFbXB0eSB8fCB2ZWNTaXplID09IDApO1xuICAgICAgICAgICAgY29sb3IgPSBjb2xvciAmJiB2ZWNTaXplID09IDQ7XG4gICAgICAgICAgICB2YXIgYWxsb3dlZCA9IFtdO1xuICAgICAgICAgICAgZm9yKHZhciBpID0gd2l0aEVtcHR5ID8gMCA6IDE7IGkgPD0gdmVjU2l6ZTsgKytpKSBhbGxvd2VkLnB1c2goaSk7XG4gICAgICAgICAgICBucy5jaGVja1BhcmFtQ291bnQocmVzdWx0Lm5vZGUsIG1ldGhvZE5hbWUsIGFsbG93ZWQsIGFyZ3MubGVuZ3RoKTtcblxuICAgICAgICAgICAgaWYod2l0aEVtcHR5ICYmIGFyZ3MubGVuZ3RoID09IDApXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgICAgICBpZihhcmdzLmxlbmd0aCA9PSAxICYmIGFyZ3NbMF0uY2FuTnVtYmVyKCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgICAgICB2YXIgaWR4ID0gMDtcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGlkeCA8IHZlY1NpemUgJiYgaSA8IGFyZ3MubGVuZ3RoOyArK2kpe1xuICAgICAgICAgICAgICAgIHZhciBhcmc9IGFyZ3NbaV0sIGNudDtcbiAgICAgICAgICAgICAgICBpZihhcmcuY2FuTnVtYmVyKCkpIGNudCA9IDE7XG4gICAgICAgICAgICAgICAgZWxzZSBpZihhcmcuaXNPZktpbmQoS0lORFMuRkxPQVQyKSkgY250ID0gMjtcbiAgICAgICAgICAgICAgICBlbHNlIGlmKGFyZy5pc09mS2luZChLSU5EUy5GTE9BVDMpKSBjbnQgPSAzO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYoYXJnLmlzT2ZLaW5kKEtJTkRTLkZMT0FUNCkpIGNudCA9IDQ7XG4gICAgICAgICAgICAgICAgZWxzZSBTaGFkZS50aHJvd0Vycm9yKHJlc3VsdC5ub2RlLCBcIkluYXZsaWQgcGFyYW1ldGVyIGZvciBcIiArIG1ldGhvZE5hbWUgKyBcIiwgdHlwZSBpcyBub3Qgc3VwcG9ydGVkXCIpO1xuICAgICAgICAgICAgICAgIC8vIFRPRE86IFByaW50IFR5cGU/XG4gICAgICAgICAgICAgICAgaWR4ICs9IGNudDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYoaWR4IDwgdmVjU2l6ZSAmJiAoIWNvbG9yIHx8IGlkeCArIDEgPCB2ZWNTaXplKSlcbiAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKHJlc3VsdC5ub2RlLCBcIkluYXZsaWQgcGFyYW1ldGVycyBmb3IgXCIgKyBtZXRob2ROYW1lICsgXCIsIGV4cGVjdGVkIFwiICsgdmVjU2l6ZSArIFwiIHNjYWxhciB2YWx1ZXMsIGdvdCBcIiArIGlkeCk7XG4gICAgICAgICAgICBlbHNlIGlmKGkgPCBhcmdzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihyZXN1bHQubm9kZSwgXCJJbmF2bGlkIHBhcmFtZXRlcnMgZm9yIFwiICsgbWV0aG9kTmFtZSArIFwiLCB0b28gbWFueSBwYXJhbWV0ZXJzXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB2ZWNFdmFsdWF0ZTogZnVuY3Rpb24ob2JqZWN0TmFtZSwgbWV0aG9kTmFtZSwgY29sb3IsIGRlc3RWZWNTaXplLCBzcmNWZWNTaXplLCByZXN1bHQsIGFyZ3MsIGN0eCwgY2FsbE9iamVjdCl7XG4gICAgICAgICAgICBWZWMuY2hlY2tWZWNBcmd1bWVudHMob2JqZWN0TmFtZSArIFwiLlwiICsgbWV0aG9kTmFtZSwgY29sb3IsIHNyY1ZlY1NpemUsIGZhbHNlLCByZXN1bHQsIGFyZ3MpO1xuXG4gICAgICAgICAgICB2YXIgdHlwZUluZm8gPSB7fTtcbiAgICAgICAgICAgIEJhc2UuZXh0ZW5kKHR5cGVJbmZvLCBWZWMuZ2V0VHlwZShkZXN0VmVjU2l6ZSwgY29sb3IpKTtcblxuICAgICAgICAgICAgVmVjLmdldFN0YXRpY1ZhbHVlKHR5cGVJbmZvLCBtZXRob2ROYW1lLCBhcmdzLCBjYWxsT2JqZWN0KTtcbiAgICAgICAgICAgIHJldHVybiB0eXBlSW5mbztcbiAgICAgICAgfSxcblxuICAgICAgICBvcHRpb25hbFplcm9FdmFsdWF0ZTogZnVuY3Rpb24ob2JqZWN0TmFtZSwgY29sb3IsIG1ldGhvZE5hbWUsIGRlc3RWZWNTaXplLCB6ZXJvRGVzdFZlY1NpemUsIHNyY1ZlY1NpemUsIHJlc3VsdCwgYXJncywgY3R4LCBjYWxsT2JqZWN0KSB7XG4gICAgICAgICAgICB2YXIgcXVhbGlmaWVkTmFtZSA9IG9iamVjdE5hbWUgKyBcIi5cIiArIG1ldGhvZE5hbWU7XG4gICAgICAgICAgICB2YXIgdHlwZUluZm8gPSB7fTtcblxuICAgICAgICAgICAgaWYoYXJncy5sZW5ndGggPT0gMCl7XG4gICAgICAgICAgICAgICAgQmFzZS5leHRlbmQodHlwZUluZm8sIFZlYy5nZXRUeXBlKHplcm9EZXN0VmVjU2l6ZSwgY29sb3IpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgVmVjLmNoZWNrVmVjQXJndW1lbnRzKHF1YWxpZmllZE5hbWUsIGNvbG9yLCBzcmNWZWNTaXplLCB0cnVlLCByZXN1bHQsIGFyZ3MpO1xuICAgICAgICAgICAgICAgIEJhc2UuZXh0ZW5kKHR5cGVJbmZvLCBWZWMuZ2V0VHlwZShkZXN0VmVjU2l6ZSwgY29sb3IpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFZlYy5nZXRTdGF0aWNWYWx1ZSh0eXBlSW5mbywgbWV0aG9kTmFtZSwgYXJncywgY2FsbE9iamVjdCk7XG5cbiAgICAgICAgICAgIHJldHVybiB0eXBlSW5mbztcbiAgICAgICAgfSxcblxuICAgICAgICBzd2l6emxlRXZhbHVhdGU6IGZ1bmN0aW9uKG9iamVjdE5hbWUsIGNvbG9yLCB2ZWNTaXplLCBzd2l6emxlLCB3aXRoU2V0dGVyLCByZXN1bHQsIGFyZ3MsIGN0eCwgY2FsbE9iamVjdCkge1xuICAgICAgICAgICAgaWYod2l0aFNldHRlcil7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFZlYy5vcHRpb25hbFplcm9FdmFsdWF0ZShvYmplY3ROYW1lLCBjb2xvciwgc3dpenpsZSwgdmVjU2l6ZSwgc3dpenpsZS5sZW5ndGgsIHN3aXp6bGUubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICByZXN1bHQsIGFyZ3MsIGN0eCwgY2FsbE9iamVjdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHJldHVybiBWZWMudmVjRXZhbHVhdGUob2JqZWN0TmFtZSwgc3dpenpsZSwgY29sb3IsIHN3aXp6bGUubGVuZ3RoLCAwLCByZXN1bHQsIGFyZ3MsIGN0eCwgY2FsbE9iamVjdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGdldFN3aXp6bGVFdmFsdWF0ZTogZnVuY3Rpb24ob2JqZWN0TmFtZSwgY29sb3IsIHZlY1NpemUsIHN3aXp6bGUpe1xuICAgICAgICAgICAgdmFyIGluZGljZXMgPSBbXSwgd2l0aFNldHRlciA9IChzd2l6emxlLmxlbmd0aCA8PSB2ZWNTaXplKTtcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IHdpdGhTZXR0ZXIgJiYgaSA8IHN3aXp6bGUubGVuZ3RoOyArK2kpe1xuICAgICAgICAgICAgICAgIHZhciBpZHggPSBWZWNCYXNlLnN3aXp6bGVUb0luZGV4KHN3aXp6bGUuY2hhckF0KGkpKTtcbiAgICAgICAgICAgICAgICBpZihpbmRpY2VzW2lkeF0pXG4gICAgICAgICAgICAgICAgICAgIHdpdGhTZXR0ZXIgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIGluZGljZXNbaWR4XSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcbiAgICAgICAgICAgICAgICBldmFsdWF0ZTogVmVjLnN3aXp6bGVFdmFsdWF0ZS5iaW5kKG51bGwsIG9iamVjdE5hbWUsIGNvbG9yLCB2ZWNTaXplLCBzd2l6emxlLCB3aXRoU2V0dGVyKVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBhdHRhY2hTd2l6emxlczogZnVuY3Rpb24gKGluc3RhbmNlLCBvYmplY3ROYW1lLCBjb2xvciwgdmVjQ291bnQpe1xuICAgICAgICAgICAgZm9yKHZhciBzID0gMDsgcyA8IFZlY0Jhc2Uuc3dpenpsZVNldHMubGVuZ3RoOyArK3Mpe1xuICAgICAgICAgICAgICAgIGZvcih2YXIgY291bnQgPSAxOyBjb3VudCA8PSA0OyArK2NvdW50KXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1heCA9IE1hdGgucG93KHZlY0NvdW50LCBjb3VudCk7XG4gICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgbWF4OyArK2kpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZhbCA9IGk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIga2V5ID0gXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcih2YXIgIGogPSAwOyBqIDwgY291bnQ7ICsrail7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkeCA9IHZhbCAlIHZlY0NvdW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IE1hdGguZmxvb3IodmFsIC8gdmVjQ291bnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleSs9IFZlY0Jhc2Uuc3dpenpsZVNldHNbc11baWR4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbmNlW2tleV0gPSBWZWMuZ2V0U3dpenpsZUV2YWx1YXRlKG9iamVjdE5hbWUsIGNvbG9yLCB2ZWNDb3VudCwga2V5KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgYXR0YWNoVmVjTWV0aG9kczogZnVuY3Rpb24oaW5zdGFuY2UsIG9iamVjdE5hbWUsIGNvbG9yLCBkZXN0VmVjU2l6ZSwgc3JjVmVjU2l6ZSwgbWV0aG9kTmFtZXMpe1xuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IG1ldGhvZE5hbWVzLmxlbmd0aDsgKytpKXtcbiAgICAgICAgICAgICAgICB2YXIgbWV0aG9kTmFtZSA9IG1ldGhvZE5hbWVzW2ldO1xuICAgICAgICAgICAgICAgIGluc3RhbmNlW21ldGhvZE5hbWVdID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcbiAgICAgICAgICAgICAgICAgICAgZXZhbHVhdGU6IFZlYy52ZWNFdmFsdWF0ZS5iaW5kKG51bGwsIG9iamVjdE5hbWUsIG1ldGhvZE5hbWUsIGNvbG9yLCBkZXN0VmVjU2l6ZSwgc3JjVmVjU2l6ZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGNvbnN0cnVjdG9yRXZhbHVhdGU6IGZ1bmN0aW9uKG9iamVjdE5hbWUsIGNvbG9yLCB2ZWNTaXplLCByZXN1bHQsIGFyZ3MsIGN0eCkge1xuICAgICAgICAgICAgVmVjLmNoZWNrVmVjQXJndW1lbnRzKG9iamVjdE5hbWUsIGNvbG9yLCB2ZWNTaXplLCB0cnVlLCByZXN1bHQsIGFyZ3MpO1xuICAgICAgICAgICAgdmFyIGFyZ0FycmF5ID0gW107XG4gICAgICAgICAgICB2YXIgaXNTdGF0aWMgPSB0cnVlO1xuICAgICAgICAgICAgYXJncy5mb3JFYWNoKGZ1bmN0aW9uIChwYXJhbSwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgICBpc1N0YXRpYyA9IGlzU3RhdGljICYmIHBhcmFtLmhhc1N0YXRpY1ZhbHVlKCk7XG4gICAgICAgICAgICAgICAgaWYgKGlzU3RhdGljKVxuICAgICAgICAgICAgICAgICAgICBhcmdBcnJheS5wdXNoKHBhcmFtLmdldFN0YXRpY1ZhbHVlKCkpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZhciB0eXBlSW5mbyA9IEJhc2UuZXh0ZW5kKHt9LFZlYy5nZXRUeXBlKHZlY1NpemUsIGNvbG9yKSk7XG5cbiAgICAgICAgICAgIGlmIChpc1N0YXRpYykge1xuICAgICAgICAgICAgICAgIHZhciB2ID0gbmV3IFNoYWRlW29iamVjdE5hbWVdKCk7XG4gICAgICAgICAgICAgICAgU2hhZGVbb2JqZWN0TmFtZV0uYXBwbHkodiwgYXJnQXJyYXkpO1xuICAgICAgICAgICAgICAgIHR5cGVJbmZvLnN0YXRpY1ZhbHVlID0gdjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0eXBlSW5mbztcbiAgICAgICAgfVxuXG4gICAgfTtcbiAgICBucy5WZWMgPSBWZWM7XG4gICAgbnMuYWxsQXJndW1lbnRzQXJlU3RhdGljID0gYWxsQXJndW1lbnRzQXJlU3RhdGljO1xuXG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uKG5zKXtcblxuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpLFxuICAgICAgICBUWVBFUyA9IFNoYWRlLlRZUEVTLFxuICAgICAgICBLSU5EUyA9IFNoYWRlLk9CSkVDVF9LSU5EUyxcbiAgICAgICAgVG9vbHMgPSByZXF1aXJlKFwiLi90b29scy5qc1wiKTtcblxuICAgIHZhciBWZWN0b3IyQ29uc3RydWN0b3IgPSAge1xuICAgICAgICB0eXBlOiBUWVBFUy5PQkpFQ1QsXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUMixcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7QW5ub3RhdGlvbn0gcmVzdWx0XG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXkuPEFubm90YXRpb24+fSBhcmdzXG4gICAgICAgICAqIEBwYXJhbSB7Q29udGV4dH0gY3R4XG4gICAgICAgICAqL1xuICAgICAgICBldmFsdWF0ZTogVG9vbHMuVmVjLmNvbnN0cnVjdG9yRXZhbHVhdGUuYmluZChudWxsLCBcIlZlYzJcIiwgZmFsc2UsIDIpXG4gICAgfTtcblxuICAgIHZhciBWZWN0b3IyU3RhdGljT2JqZWN0ID0ge1xuICAgIH07XG5cbiAgICB2YXIgVmVjdG9yMkluc3RhbmNlID0ge1xuICAgICAgICBsZW5ndGg6IHtcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxuICAgICAgICAgICAgZXZhbHVhdGU6IFRvb2xzLlZlYy5vcHRpb25hbFplcm9FdmFsdWF0ZS5iaW5kKG51bGwsXCJWZWMyXCIsIGZhbHNlLCBcImxlbmd0aFwiLCAyLCAxLCAxKVxuICAgICAgICB9XG4gICAgfTtcbiAgICBUb29scy5WZWMuYXR0YWNoU3dpenpsZXMoVmVjdG9yMkluc3RhbmNlLCBcIlZlYzJcIiwgZmFsc2UsIDIpO1xuICAgIFRvb2xzLlZlYy5hdHRhY2hWZWNNZXRob2RzKFZlY3RvcjJJbnN0YW5jZSwgXCJWZWMyXCIsIGZhbHNlLCAyLCAyLCBbJ2FkZCcsICdzdWInLCAnbXVsJywgJ2RpdicsICdtb2QnXSk7XG4gICAgVG9vbHMuVmVjLmF0dGFjaFZlY01ldGhvZHMoVmVjdG9yMkluc3RhbmNlLCBcIlZlYzJcIiwgZmFsc2UsIDEsIDIsIFsnZG90J10pO1xuICAgIFRvb2xzLlZlYy5hdHRhY2hWZWNNZXRob2RzKFZlY3RvcjJJbnN0YW5jZSwgXCJWZWMyXCIsIGZhbHNlLCAyLCAwLCBbJ25vcm1hbGl6ZSddKTtcblxuXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIlZlYzJcIixcbiAgICAgICAga2luZDogS0lORFMuRkxPQVQyLFxuICAgICAgICBvYmplY3Q6IHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBWZWN0b3IyQ29uc3RydWN0b3IsXG4gICAgICAgICAgICBzdGF0aWM6IFZlY3RvcjJTdGF0aWNPYmplY3RcbiAgICAgICAgfSxcbiAgICAgICAgaW5zdGFuY2U6IFZlY3RvcjJJbnN0YW5jZVxuICAgIH0pO1xuXG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uKG5zKXtcblxuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpLFxuICAgICAgICBUWVBFUyA9IFNoYWRlLlRZUEVTLFxuICAgICAgICBLSU5EUyA9IFNoYWRlLk9CSkVDVF9LSU5EUyxcbiAgICAgICAgVG9vbHMgPSByZXF1aXJlKFwiLi90b29scy5qc1wiKTtcblxuICAgIHZhciBWZWN0b3IzQ29uc3RydWN0b3IgPSAge1xuICAgICAgICB0eXBlOiBUWVBFUy5PQkpFQ1QsXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUMyxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7QW5ub3RhdGlvbn0gcmVzdWx0XG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXkuPEFubm90YXRpb24+fSBhcmdzXG4gICAgICAgICAqIEBwYXJhbSB7Q29udGV4dH0gY3R4XG4gICAgICAgICAqL1xuICAgICAgICBldmFsdWF0ZTogVG9vbHMuVmVjLmNvbnN0cnVjdG9yRXZhbHVhdGUuYmluZChudWxsLCBcIlZlYzNcIiwgZmFsc2UsIDMpXG4gICAgfTtcblxuICAgIHZhciBWZWN0b3IzU3RhdGljT2JqZWN0ID0ge1xuICAgIH07XG5cbiAgICB2YXIgVmVjdG9yM0luc3RhbmNlID0ge1xuICAgICAgICBsZW5ndGg6IHtcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxuICAgICAgICAgICAgZXZhbHVhdGU6IFRvb2xzLlZlYy5vcHRpb25hbFplcm9FdmFsdWF0ZS5iaW5kKG51bGwsXCJWZWMzXCIsIGZhbHNlLCBcImxlbmd0aFwiLCAzLCAxLCAxKVxuICAgICAgICB9XG4gICAgfTtcbiAgICBUb29scy5WZWMuYXR0YWNoU3dpenpsZXMoVmVjdG9yM0luc3RhbmNlLCBcIlZlYzNcIiwgZmFsc2UsIDMpO1xuICAgIFRvb2xzLlZlYy5hdHRhY2hWZWNNZXRob2RzKFZlY3RvcjNJbnN0YW5jZSwgXCJWZWMzXCIsIGZhbHNlLCAzLCAzLCBbJ2FkZCcsICdzdWInLCAnbXVsJywgJ2RpdicsICdtb2QnXSk7XG4gICAgVG9vbHMuVmVjLmF0dGFjaFZlY01ldGhvZHMoVmVjdG9yM0luc3RhbmNlLCBcIlZlYzNcIiwgZmFsc2UsIDEsIDMsIFsnZG90J10pO1xuICAgIFRvb2xzLlZlYy5hdHRhY2hWZWNNZXRob2RzKFZlY3RvcjNJbnN0YW5jZSwgXCJWZWMzXCIsIGZhbHNlLCAzLCAwLCBbJ25vcm1hbGl6ZSddKTtcblxuXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIlZlYzNcIixcbiAgICAgICAga2luZDogS0lORFMuRkxPQVQzLFxuICAgICAgICBvYmplY3Q6IHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBWZWN0b3IzQ29uc3RydWN0b3IsXG4gICAgICAgICAgICBzdGF0aWM6IFZlY3RvcjNTdGF0aWNPYmplY3RcbiAgICAgICAgfSxcbiAgICAgICAgaW5zdGFuY2U6IFZlY3RvcjNJbnN0YW5jZVxuICAgIH0pO1xuXG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uKG5zKXtcblxuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpLFxuICAgICAgICBUWVBFUyA9IFNoYWRlLlRZUEVTLFxuICAgICAgICBLSU5EUyA9IFNoYWRlLk9CSkVDVF9LSU5EUyxcbiAgICAgICAgVG9vbHMgPSByZXF1aXJlKFwiLi90b29scy5qc1wiKTtcblxuICAgIHZhciBWZWN0b3I0Q29uc3RydWN0b3IgPSAge1xuICAgICAgICB0eXBlOiBUWVBFUy5PQkpFQ1QsXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUNCxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7QW5ub3RhdGlvbn0gcmVzdWx0XG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXkuPEFubm90YXRpb24+fSBhcmdzXG4gICAgICAgICAqIEBwYXJhbSB7Q29udGV4dH0gY3R4XG4gICAgICAgICAqL1xuICAgICAgICBldmFsdWF0ZTogVG9vbHMuVmVjLmNvbnN0cnVjdG9yRXZhbHVhdGUuYmluZChudWxsLCBcIlZlYzRcIiwgZmFsc2UsIDQpXG4gICAgfTtcblxuICAgIHZhciBWZWN0b3I0U3RhdGljT2JqZWN0ID0ge1xuICAgIH07XG5cbiAgICB2YXIgVmVjdG9yNEluc3RhbmNlID0ge1xuICAgICAgICBsZW5ndGg6IHtcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxuICAgICAgICAgICAgZXZhbHVhdGU6IFRvb2xzLlZlYy5vcHRpb25hbFplcm9FdmFsdWF0ZS5iaW5kKG51bGwsXCJWZWM0XCIsIGZhbHNlLCBcImxlbmd0aFwiLCA0LCAxLCAxKVxuICAgICAgICB9XG4gICAgfTtcbiAgICBUb29scy5WZWMuYXR0YWNoU3dpenpsZXMoVmVjdG9yNEluc3RhbmNlLCBcIlZlYzRcIiwgZmFsc2UsIDQpO1xuICAgIFRvb2xzLlZlYy5hdHRhY2hWZWNNZXRob2RzKFZlY3RvcjRJbnN0YW5jZSwgXCJWZWM0XCIsIGZhbHNlLCA0LCA0LCBbJ2FkZCcsICdzdWInLCAnbXVsJywgJ2RpdicsICdtb2QnXSk7XG4gICAgVG9vbHMuVmVjLmF0dGFjaFZlY01ldGhvZHMoVmVjdG9yNEluc3RhbmNlLCBcIlZlYzRcIiwgZmFsc2UsIDEsIDQsIFsnZG90J10pO1xuICAgIFRvb2xzLlZlYy5hdHRhY2hWZWNNZXRob2RzKFZlY3RvcjRJbnN0YW5jZSwgXCJWZWM0XCIsIGZhbHNlLCA0LCAwLCBbJ25vcm1hbGl6ZSddKTtcblxuXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIlZlYzRcIixcbiAgICAgICAga2luZDogS0lORFMuRkxPQVQ0LFxuICAgICAgICBvYmplY3Q6IHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBWZWN0b3I0Q29uc3RydWN0b3IsXG4gICAgICAgICAgICBzdGF0aWM6IFZlY3RvcjRTdGF0aWNPYmplY3RcbiAgICAgICAgfSxcbiAgICAgICAgaW5zdGFuY2U6IFZlY3RvcjRJbnN0YW5jZVxuICAgIH0pO1xuXG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uIChucykge1xuICAgIC8qKlxuICAgICAqIFNoYWRlLmpzIHNwZWNpZmljIHR5cGUgaW5mZXJlbmNlIHRoYXQgaXMgYWxzbyBpbmZlcnJpbmdcbiAgICAgKiB2aXJ0dWFsIHR5cGVzIHtAbGluayBTaGFkZS5UWVBFUyB9XG4gICAgICovXG5cbiAgICB2YXIgd2FsayA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKSxcbiAgICAgICAgZW50ZXJFeHByZXNzaW9uID0gcmVxdWlyZSgnLi9pbmZlcl9leHByZXNzaW9uLmpzJykuZW50ZXJFeHByZXNzaW9uLFxuICAgICAgICBleGl0RXhwcmVzc2lvbiA9IHJlcXVpcmUoJy4vaW5mZXJfZXhwcmVzc2lvbi5qcycpLmV4aXRFeHByZXNzaW9uLFxuICAgICAgICBlbnRlclN0YXRlbWVudCA9IHJlcXVpcmUoJy4vaW5mZXJfc3RhdGVtZW50LmpzJykuZW50ZXJTdGF0ZW1lbnQsXG4gICAgICAgIGV4aXRTdGF0ZW1lbnQgPSByZXF1aXJlKCcuL2luZmVyX3N0YXRlbWVudC5qcycpLmV4aXRTdGF0ZW1lbnQsXG5cbiAgICAgICAgT2JqZWN0UmVnaXN0cnkgPSByZXF1aXJlKFwiLi9yZWdpc3RyeS9pbmRleC5qc1wiKS5SZWdpc3RyeSxcbiAgICAgICAgQ29udGV4dCA9IHJlcXVpcmUoXCIuLy4uLy4uL2Jhc2UvY29udGV4dC5qc1wiKS5nZXRDb250ZXh0KE9iamVjdFJlZ2lzdHJ5KSxcbiAgICAgICAgQmFzZSA9IHJlcXVpcmUoXCIuLi8uLi9iYXNlL2luZGV4LmpzXCIpLFxuICAgICAgICBBbm5vdGF0aW9uID0gcmVxdWlyZShcIi4vLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkFubm90YXRpb24sXG4gICAgICAgIEZ1bmN0aW9uQW5ub3RhdGlvbiA9IHJlcXVpcmUoXCIuLy4uLy4uL2Jhc2UvYW5ub3RhdGlvbi5qc1wiKS5GdW5jdGlvbkFubm90YXRpb247XG5cblxuXG4gICAgdmFyIFN5bnRheCA9IHdhbGsuU3ludGF4O1xuXG5cbiAgICB2YXIgcmVnaXN0ZXJHbG9iYWxDb250ZXh0ID0gZnVuY3Rpb24gKHByb2dyYW0pIHtcbiAgICAgICAgdmFyIGN0eCA9IG5ldyBDb250ZXh0KHByb2dyYW0sIG51bGwsIHtuYW1lOiBcImdsb2JhbFwifSk7XG4gICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIk1hdGhcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiTWF0aFwiKSk7XG4gICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIkNvbG9yXCIsIE9iamVjdFJlZ2lzdHJ5LmdldEJ5TmFtZShcIkNvbG9yXCIpKTtcbiAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwiVmVjMlwiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJWZWMyXCIpKTtcbiAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwiVmVjM1wiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJWZWMzXCIpKTtcbiAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwiVmVjNFwiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJWZWM0XCIpKTtcbiAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwiU2hhZGVcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiU2hhZGVcIikpO1xuICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJ0aGlzXCIsIE9iamVjdFJlZ2lzdHJ5LmdldEJ5TmFtZShcIlN5c3RlbVwiKSk7XG4gICAgICAgIHJldHVybiBjdHg7XG4gICAgfVxuXG4gICAgdmFyIFR5cGVJbmZlcmVuY2UgPSBmdW5jdGlvbiAocm9vdCwgb3B0KSB7XG4gICAgICAgIG9wdCA9IG9wdCB8fCB7fTtcbiAgICAgICAgdGhpcy5yb290ID0gcm9vdDtcbiAgICAgICAgdGhpcy5jb250ZXh0ID0gW107XG4gICAgICAgIC8qKiBAdHlwZSB7T2JqZWN0LjxTdHJpbmcsIEFycmF5LjxUeXBlSW5mbz59ICoqL1xuICAgICAgICB0aGlzLmluamVjdGlvbnMgPSB7fTtcbiAgICAgICAgdGhpcy5lbnRyeVBvaW50ID0gb3B0LmVudHJ5IHx8IFwiZ2xvYmFsLnNoYWRlXCI7XG4gICAgICAgIHRoaXMucm9vdC5pbmplY3Rpb25zID0gdGhpcy5pbmplY3Rpb25zO1xuICAgICAgICB0aGlzLmZ1bmN0aW9ucyA9IHtcbiAgICAgICAgICAgIG9yaWc6IHt9LFxuICAgICAgICAgICAgZGVyaXZlZDoge31cbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgQmFzZS5leHRlbmQoVHlwZUluZmVyZW5jZS5wcm90b3R5cGUsIHtcbiAgICAgICAgcHVzaENvbnRleHQ6IGZ1bmN0aW9uIChjb250ZXh0KSB7XG4gICAgICAgICAgICB0aGlzLmNvbnRleHQucHVzaChjb250ZXh0KTtcbiAgICAgICAgICAgIHZhciBpbmplY3Rpb24gPSB0aGlzLmluamVjdGlvbnNbY29udGV4dC5zdHIoKV07XG4gICAgICAgICAgICBpZiAoaW5qZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgY29udGV4dC5pbmplY3RQYXJhbWV0ZXJzKGluamVjdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHBvcENvbnRleHQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuY29udGV4dC5wb3AoKTtcbiAgICAgICAgfSxcbiAgICAgICAgcGVla0NvbnRleHQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnRleHRbdGhpcy5jb250ZXh0Lmxlbmd0aCAtIDFdO1xuICAgICAgICB9LFxuICAgICAgICBjcmVhdGVDb250ZXh0OiBmdW5jdGlvbiAobm9kZSwgcGFyZW50Q29udGV4dCwgbmFtZSkge1xuICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IENvbnRleHQobm9kZSwgcGFyZW50Q29udGV4dCwge25hbWU6IG5hbWUgfSApO1xuICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9LFxuXG4gICAgICAgIGFubm90YXRlUGFyYW1ldGVyczogZnVuY3Rpb24oYXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gYXJyID8gYXJyLm1hcChmdW5jdGlvbihwYXJhbSkge1xuICAgICAgICAgICAgICAgIHZhciBhbm5vdGF0ZWQgPSAgbmV3IEFubm90YXRpb24ocGFyYW0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBhbm5vdGF0ZWQ7XG4gICAgICAgICAgICB9KSA6IFtdO1xuICAgICAgICB9LFxuXG5cbiAgICAgICAgYnVpbGRGdW5jdGlvbk1hcDogZnVuY3Rpb24ocHJnKSB7XG4gICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgICAgICB3YWxrLnJlcGxhY2UocHJnLCB7XG4gICAgICAgICAgICAgICAgZW50ZXI6IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUudHlwZSA9PSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBGdW5jdGlvbkFubm90YXRpb24obm9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZnVuY3Rpb25OYW1lID0gbm9kZS5pZC5uYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmVudENvbnRleHQgPSB0aGF0LnBlZWtDb250ZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZnVuY3Rpb25Db250ZXh0ID0gdGhhdC5jcmVhdGVDb250ZXh0KG5vZGUsIHBhcmVudENvbnRleHQsIGZ1bmN0aW9uTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbkNvbnRleHQuZGVjbGFyZVBhcmFtZXRlcnMobm9kZS5wYXJhbXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50Q29udGV4dC5kZWNsYXJlVmFyaWFibGUoZnVuY3Rpb25OYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudENvbnRleHQudXBkYXRlRXhwcmVzc2lvbihmdW5jdGlvbk5hbWUsIHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnB1c2hDb250ZXh0KGZ1bmN0aW9uQ29udGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmZ1bmN0aW9ucy5vcmlnW2Z1bmN0aW9uQ29udGV4dC5zdHIoKV0gPSBub2RlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBsZWF2ZTogZnVuY3Rpb24obm9kZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS50eXBlID09IFN5bnRheC5GdW5jdGlvbkRlY2xhcmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBvcENvbnRleHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IFN5bnRheC5FbXB0eVN0YXRlbWVudCB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgIHByZy5ib2R5ID0gcHJnLmJvZHkuZmlsdGVyKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGEudHlwZSAhPSBTeW50YXguRW1wdHlTdGF0ZW1lbnQ7IH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIHRyYXZlcnNlOiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgd2Fsay50cmF2ZXJzZShub2RlLCB7XG4gICAgICAgICAgICAgICAgZW50ZXI6IHRoaXMuZW50ZXJOb2RlLmJpbmQodGhpcyksXG4gICAgICAgICAgICAgICAgbGVhdmU6IHRoaXMuZXhpdE5vZGUuYmluZCh0aGlzKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgICAgfSxcblxuICAgICAgICBlbnRlck5vZGU6IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQpIHtcbiAgICAgICAgICAgIHZhciBjb250ZXh0ID0gdGhpcy5jb250ZXh0W3RoaXMuY29udGV4dC5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN3aXRjaEtpbmQobm9kZSwgcGFyZW50LCBjb250ZXh0LCBlbnRlclN0YXRlbWVudCwgZW50ZXJFeHByZXNzaW9uKTtcbiAgICAgICAgfSxcblxuICAgICAgICBleGl0Tm9kZTogZnVuY3Rpb24gKG5vZGUsIHBhcmVudCkge1xuICAgICAgICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLmNvbnRleHRbdGhpcy5jb250ZXh0Lmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3dpdGNoS2luZChub2RlLCBwYXJlbnQsIGNvbnRleHQsIGV4aXRTdGF0ZW1lbnQsIGV4aXRFeHByZXNzaW9uKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzd2l0Y2hLaW5kOiBmdW5jdGlvbiAobm9kZSwgcGFyZW50LCBjdHgsIHN0YXRlbWVudCwgZXhwcmVzc2lvbikge1xuICAgICAgICAgICAgc3dpdGNoIChub2RlLnR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5CbG9ja1N0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5CcmVha1N0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5DYXRjaENsYXVzZTpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Db250aW51ZVN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5EaXJlY3RpdmVTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRG9XaGlsZVN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5EZWJ1Z2dlclN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5FbXB0eVN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5FeHByZXNzaW9uU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkZvclN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Gb3JJblN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LklmU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkxhYmVsZWRTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguUHJvZ3JhbTpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5SZXR1cm5TdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguU3dpdGNoU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlN3aXRjaENhc2U6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguVGhyb3dTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguVHJ5U3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlZhcmlhYmxlRGVjbGFyYXRpb246XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguVmFyaWFibGVEZWNsYXJhdG9yOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LldoaWxlU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LldpdGhTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzdGF0ZW1lbnQuY2FsbCh0aGlzLCBub2RlLCBwYXJlbnQsIGN0eCk7XG5cbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Bc3NpZ25tZW50RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5BcnJheUV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQXJyYXlQYXR0ZXJuOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkJpbmFyeUV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQ2FsbEV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQ29uZGl0aW9uYWxFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkZ1bmN0aW9uRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5JZGVudGlmaWVyOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkxpdGVyYWw6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguTG9naWNhbEV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguTWVtYmVyRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5OZXdFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4Lk9iamVjdEV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguT2JqZWN0UGF0dGVybjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Qcm9wZXJ0eTpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5TZXF1ZW5jZUV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguVGhpc0V4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguVW5hcnlFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlVwZGF0ZUV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguWWllbGRFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXhwcmVzc2lvbi5jYWxsKHRoaXMsIG5vZGUsIHBhcmVudCwgY3R4KTtcblxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBub2RlIHR5cGU6ICcgKyBub2RlLnR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gZnVuY3Rpb25BU1RcbiAgICAgICAgICogQHBhcmFtIHtBcnJheS48VHlwZUluZm8+IHBhcmFtc1xuICAgICAgICAgKiBAcGFyYW0ge0NvbnRleHR9IHBhcmVudENvbnRleHRcbiAgICAgICAgICogQHJldHVybnMgeyp9XG4gICAgICAgICAqL1xuICAgICAgICBpbmZlckZ1bmN0aW9uOiBmdW5jdGlvbiAoZnVuY3Rpb25BU1QsIHBhcmFtcywgcGFyZW50Q29udGV4dCkge1xuICAgICAgICAgICAgdmFyIGZ1bmN0aW9uTmFtZSA9IGZ1bmN0aW9uQVNULmlkLm5hbWU7XG4gICAgICAgICAgICB2YXIgdGFyZ2V0Q29udGV4dE5hbWUgPSBwYXJlbnRDb250ZXh0LmdldFZhcmlhYmxlSWRlbnRpZmllcihmdW5jdGlvbk5hbWUpO1xuICAgICAgICAgICAgdGhpcy5pbmplY3Rpb25zW3RhcmdldENvbnRleHROYW1lXSA9IHBhcmFtcztcblxuICAgICAgICAgICAgLy8gV2UgaGF2ZSBhIHNwZWNpZmMgdHlwZSBzZXQgaW4gcGFyYW1zIHRoYXQgd2UgYW5ub3RhdGUgdG8gdGhlXG4gICAgICAgICAgICAvLyBmdW5jdGlvbiBBU1RcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBwYXJhbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoaSA9PSBmdW5jdGlvbkFTVC5wYXJhbXMubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB2YXIgZnVuY1BhcmFtID0gbmV3IEFubm90YXRpb24oZnVuY3Rpb25BU1QucGFyYW1zW2ldKTtcbiAgICAgICAgICAgICAgICBmdW5jUGFyYW0uc2V0RnJvbUV4dHJhKHBhcmFtc1tpXS5nZXRFeHRyYSgpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIG9sZEVudHJ5UG9pbnQgPSB0aGlzLmVudHJ5UG9pbnQ7XG4gICAgICAgICAgICB0aGlzLmVudHJ5UG9pbnQgPSB0YXJnZXRDb250ZXh0TmFtZTtcbiAgICAgICAgICAgIHRoaXMucHVzaENvbnRleHQocGFyZW50Q29udGV4dCk7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiU3RhcnRpbmcgdG8gdHJhdmVyc2U6IFwiICsgZnVuY3Rpb25OYW1lICsgXCIgaW4gY29udGV4dCBcIiArIHBhcmVudENvbnRleHQuc3RyKCkpXG4gICAgICAgICAgICB2YXIgYXN0ID0gdGhpcy50cmF2ZXJzZShmdW5jdGlvbkFTVCk7XG4gICAgICAgICAgICB0aGlzLnBvcENvbnRleHQoKTtcbiAgICAgICAgICAgIHRoaXMuZW50cnlQb2ludCA9IG9sZEVudHJ5UG9pbnQ7XG5cbiAgICAgICAgICAgIHJldHVybiBhc3Q7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaW5mZXJQcm9ncmFtOiBmdW5jdGlvbihwcmcsIHBhcmFtcykge1xuICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcbiAgICAgICAgICAgIHZhciBwcm9ncmFtQ29udGV4dCA9IHJlZ2lzdGVyR2xvYmFsQ29udGV4dChwcmcpO1xuXG4gICAgICAgICAgICB0aGlzLnB1c2hDb250ZXh0KHByb2dyYW1Db250ZXh0KTtcbiAgICAgICAgICAgIHRoaXMuYnVpbGRGdW5jdGlvbk1hcChwcmcpO1xuICAgICAgICAgICAgdGhpcy50cmF2ZXJzZShwcmcpO1xuICAgICAgICAgICAgdGhpcy5wb3BDb250ZXh0KCk7XG5cbiAgICAgICAgICAgIHZhciBlbnRyeVBvaW50ID0gdGhpcy5lbnRyeVBvaW50O1xuICAgICAgICAgICAgaWYgKHRoaXMuZnVuY3Rpb25zLm9yaWcuaGFzT3duUHJvcGVydHkoZW50cnlQb2ludCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgYXN0ID0gdGhpcy5mdW5jdGlvbnMub3JpZ1tlbnRyeVBvaW50XTtcbiAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0gdGhpcy5hbm5vdGF0ZVBhcmFtZXRlcnMocGFyYW1zW2VudHJ5UG9pbnRdKTtcbiAgICAgICAgICAgICAgICB2YXIgYWFzdCA9IHRoaXMuaW5mZXJGdW5jdGlvbihhc3QsIHBhcmFtcywgcHJvZ3JhbUNvbnRleHQpO1xuICAgICAgICAgICAgICAgIGZvcih2YXIgZnVuYyBpbiB0aGlzLmZ1bmN0aW9ucy5kZXJpdmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB2YXJpYXRpb25zID0gdGhpcy5mdW5jdGlvbnMuZGVyaXZlZFtmdW5jXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgc2lnbmF0dXJlIGluIHZhcmlhdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZy5ib2R5LnB1c2godmFyaWF0aW9uc1tzaWduYXR1cmVdLmFzdCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwcmcuYm9keS5wdXNoKGFhc3QpO1xuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmNvbnRleHQubGVuZ3RoKVxuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiU29tZXRoaW5nIHdlbnQgd3JvbmdcIik7XG4gICAgICAgICAgICByZXR1cm4gcHJnO1xuICAgICAgICB9LFxuICAgICAgICBnZXRGdW5jdGlvbkluZm9ybWF0aW9uRm9yOiBmdW5jdGlvbihuYW1lLCBhcmdzLCBkZWZpbmluZ0NvbnRleHQpIHtcbiAgICAgICAgICAgIHZhciBzaWduYXR1cmUgPSBhcmdzLnJlZHVjZShmdW5jdGlvbihzdHIsIGFyZykgeyByZXR1cm4gc3RyICsgYXJnLmdldFR5cGVTdHJpbmcoKX0sIFwiXCIpO1xuICAgICAgICAgICAgaWYgKHRoaXMuZnVuY3Rpb25zLmRlcml2ZWQuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgICAgICAgICB2YXIgZGVyaXZlZEZ1bmN0aW9uID0gdGhpcy5mdW5jdGlvbnMuZGVyaXZlZFtuYW1lXTtcbiAgICAgICAgICAgICAgICBpZiAoZGVyaXZlZEZ1bmN0aW9uLmhhc093blByb3BlcnR5KHNpZ25hdHVyZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRlcml2ZWRGdW5jdGlvbltzaWduYXR1cmVdLmluZm87XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuZnVuY3Rpb25zLm9yaWcuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgICAgICAgICB2YXIgYXN0ID0gdGhpcy5mdW5jdGlvbnMub3JpZ1tuYW1lXTtcbiAgICAgICAgICAgICAgICB2YXIgdmFyaWF0aW9ucyA9IHRoaXMuZnVuY3Rpb25zLmRlcml2ZWRbbmFtZV0gPSB0aGlzLmZ1bmN0aW9ucy5kZXJpdmVkW25hbWVdIHx8IHt9O1xuICAgICAgICAgICAgICAgIHZhciBkZXJpdmVkID0gdmFyaWF0aW9uc1tzaWduYXR1cmVdID0ge307XG4gICAgICAgICAgICAgICAgZGVyaXZlZC5hc3QgPSB0aGlzLmluZmVyRnVuY3Rpb24oSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShhc3QpKSwgYXJncywgZGVmaW5pbmdDb250ZXh0KTtcbiAgICAgICAgICAgICAgICBkZXJpdmVkLmluZm8gPSBkZXJpdmVkLmFzdC5leHRyYS5yZXR1cm5JbmZvO1xuICAgICAgICAgICAgICAgIGRlcml2ZWQuaW5mby5uZXdOYW1lID0gbmFtZS5yZXBsYWNlKC9cXC4vZywgJ18nKSArIE9iamVjdC5rZXlzKHZhcmlhdGlvbnMpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBkZXJpdmVkLmFzdC5pZC5uYW1lID0gZGVyaXZlZC5pbmZvLm5ld05hbWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlcml2ZWQuaW5mbztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCByZXNvbHZlIGZ1bmN0aW9uIFwiICsgbmFtZSk7XG4gICAgICAgIH1cblxuICAgIH0pO1xuXG5cbiAgICBucy5pbmZlciA9IGZ1bmN0aW9uIChhc3QsIG9wdCkge1xuICAgICAgICB2YXIgdGkgPSBuZXcgVHlwZUluZmVyZW5jZShhc3QsIG9wdCk7XG4gICAgICAgIHJldHVybiB0aS5pbmZlclByb2dyYW0odGkucm9vdCwgb3B0LmluamVjdCk7XG4gICAgfTtcblxuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucyl7XG5cbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheCxcbiAgICAgICAgQmFzZSA9IHJlcXVpcmUoXCIuL2luZGV4LmpzXCIpLFxuICAgICAgICBUeXBlSW5mbyA9IHJlcXVpcmUoXCIuL3R5cGVpbmZvLmpzXCIpLlR5cGVJbmZvO1xuXG4gICAgdmFyIFRZUEVTID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTO1xuXG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gbm9kZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBleHRyYVxuICAgICAqIEBleHRlbmRzIFR5cGVJbmZvXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgdmFyIEFubm90YXRpb24gPSBmdW5jdGlvbiAobm9kZSwgZXh0cmEpIHtcbiAgICAgICAgVHlwZUluZm8uY2FsbCh0aGlzLCBub2RlLCBleHRyYSk7XG4gICAgfTtcblxuICAgIEJhc2UuY3JlYXRlQ2xhc3MoQW5ub3RhdGlvbiwgVHlwZUluZm8sIHtcblxuICAgICAgICBzZXRDYWxsIDogZnVuY3Rpb24oY2FsbCkge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgZXh0cmEuZXZhbHVhdGUgPSBjYWxsO1xuICAgICAgICB9LFxuICAgICAgICBnZXRDYWxsIDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRFeHRyYSgpLmV2YWx1YXRlO1xuICAgICAgICB9LFxuICAgICAgICBjbGVhckNhbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgZGVsZXRlIGV4dHJhLmV2YWx1YXRlO1xuICAgICAgICB9LFxuICAgICAgICBlbGltaW5hdGUgOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcbiAgICAgICAgICAgIGV4dHJhLmVsaW1pbmF0ZSA9IHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIGNhbkVsaW1pbmF0ZSA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgcmV0dXJuIGV4dHJhLmVsaW1pbmF0ZSA9PSB0cnVlO1xuICAgICAgICB9XG5cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7QXJyYXkuPG9iamVjdD59IGFyciBBcnJheSBvZiBub2Rlc1xuICAgICAqIEBwYXJhbSB7Q29udGV4dH0gY3R4XG4gICAgICogQHJldHVybnMge0FycmF5LjxBbm5vdGF0aW9uPn1cbiAgICAgKi9cbiAgICBBbm5vdGF0aW9uLmNyZWF0ZUFubm90YXRlZE5vZGVBcnJheSA9IGZ1bmN0aW9uKGFyciwgY3R4KSB7XG4gICAgICAgIHJldHVybiBhcnIubWFwKGZ1bmN0aW9uIChhcmcpIHtcbiAgICAgICAgICAgIHJldHVybiBjdHguY3JlYXRlVHlwZUluZm8oYXJnKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gbm9kZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBleHRyYVxuICAgICAqIEBleHRlbmRzIEFubm90YXRpb25cbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICB2YXIgRnVuY3Rpb25Bbm5vdGF0aW9uID0gZnVuY3Rpb24gKG5vZGUsIGV4dHJhKSB7XG4gICAgICAgIEFubm90YXRpb24uY2FsbCh0aGlzLCBub2RlLCBleHRyYSk7XG4gICAgICAgIHRoaXMuc2V0VHlwZShUWVBFUy5GVU5DVElPTik7XG4gICAgfTtcblxuICAgIEJhc2UuY3JlYXRlQ2xhc3MoRnVuY3Rpb25Bbm5vdGF0aW9uLCBBbm5vdGF0aW9uLCB7XG4gICAgICAgIGdldFJldHVybkluZm86IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RXh0cmEoKS5yZXR1cm5JbmZvO1xuICAgICAgICB9LFxuICAgICAgICBzZXRSZXR1cm5JbmZvOiBmdW5jdGlvbihpbmZvKSB7XG4gICAgICAgICAgICB0aGlzLmdldEV4dHJhKCkucmV0dXJuSW5mbyA9IGluZm87XG4gICAgICAgIH0sXG4gICAgICAgIGlzVXNlZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gISF0aGlzLmdldEV4dHJhKCkudXNlZDtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0VXNlZDogZnVuY3Rpb24odikge1xuICAgICAgICAgICAgdGhpcy5nZXRFeHRyYSgpLnVzZWQgPSB2O1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBucy5Bbm5vdGF0aW9uID0gQW5ub3RhdGlvbjtcbiAgICBucy5GdW5jdGlvbkFubm90YXRpb24gPSBGdW5jdGlvbkFubm90YXRpb247XG4gICAgbnMuQU5OTyA9IGZ1bmN0aW9uKG9iamVjdCl7cmV0dXJuIG5ldyBBbm5vdGF0aW9uKG9iamVjdCl9O1xuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucyl7XG5cbiAgICB2YXIgQmFzZSA9IHJlcXVpcmUoXCIuL2luZGV4LmpzXCIpLFxuICAgICAgICBTaGFkZSA9IHJlcXVpcmUoXCIuLi9pbnRlcmZhY2VzLmpzXCIpLFxuICAgICAgICBUWVBFUyA9IFNoYWRlLlRZUEVTLFxuICAgICAgICBBbm5vdGF0aW9uID0gcmVxdWlyZShcIi4vYW5ub3RhdGlvbi5qc1wiKS5Bbm5vdGF0aW9uLFxuICAgICAgICBUeXBlSW5mbyA9IHJlcXVpcmUoXCIuL3R5cGVpbmZvLmpzXCIpLlR5cGVJbmZvLFxuICAgICAgICBTeW50YXggPSByZXF1aXJlKCdlc3RyYXZlcnNlJykuU3ludGF4O1xuXG4gICAgbnMuZ2V0Q29udGV4dCA9IGZ1bmN0aW9uKHJlZ2lzdHJ5KSB7XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBiaW5kaW5nXG4gICAgICogQGV4dGVuZHMgVHlwZUluZm9cbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICB2YXIgQmluZGluZyA9IGZ1bmN0aW9uKGJpbmRpbmcsIHJlZ2lzdGVyeSkge1xuICAgICAgICBUeXBlSW5mby5jYWxsKHRoaXMsIGJpbmRpbmcpO1xuICAgICAgICBpZih0aGlzLm5vZGUucmVmKSB7XG4gICAgICAgICAgICBpZiAoIXJlZ2lzdGVyeVt0aGlzLm5vZGUucmVmXSlcbiAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIk5vIG9iamVjdCBoYXMgYmVlbiByZWdpc3RlcmVkIGZvcjogXCIgKyB0aGlzLm5vZGUucmVmKTtcbiAgICAgICAgICAgIHRoaXMuZ2xvYmFsT2JqZWN0ID0gcmVnaXN0ZXJ5W3RoaXMubm9kZS5yZWZdLm9iamVjdDtcbiAgICAgICAgICAgIGlmICh0aGlzLmdsb2JhbE9iamVjdCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0VHlwZShUWVBFUy5PQkpFQ1QpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgQmFzZS5jcmVhdGVDbGFzcyhCaW5kaW5nLCBUeXBlSW5mbywge1xuICAgICAgICBoYXNDb25zdHJ1Y3RvcjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gISF0aGlzLmdldENvbnN0cnVjdG9yKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGdldENvbnN0cnVjdG9yOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdsb2JhbE9iamVjdCAmJiB0aGlzLmdsb2JhbE9iamVjdC5jb25zdHJ1Y3RvcjtcbiAgICAgICAgfSxcbiAgICAgICAgaXNJbml0aWFsaXplZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5ub2RlLmluaXRpYWxpemVkO1xuICAgICAgICB9LFxuICAgICAgICBzZXRJbml0aWFsaXplZDogZnVuY3Rpb24odikge1xuICAgICAgICAgICAgdGhpcy5ub2RlLmluaXRpYWxpemVkID0gdjtcbiAgICAgICAgfSxcbiAgICAgICAgaGFzU3RhdGljVmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9LFxuICAgICAgICBpc0dsb2JhbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5ub2RlLmluZm8gJiYgdGhpcy5ub2RlLmluZm8uX2dsb2JhbCB8fCBUeXBlSW5mby5wcm90b3R5cGUuaXNHbG9iYWwuY2FsbCh0aGlzKTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0VHlwZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nbG9iYWxPYmplY3Q/IFRZUEVTLk9CSkVDVCA6IFR5cGVJbmZvLnByb3RvdHlwZS5nZXRUeXBlLmNhbGwodGhpcyk7XG4gICAgICAgIH0sXG4gICAgICAgIGdldE9iamVjdEluZm86IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuZ2xvYmFsT2JqZWN0KVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdsb2JhbE9iamVjdC5zdGF0aWM7XG4gICAgICAgICAgICBpZiAodGhpcy5pc09iamVjdCgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubm9kZS5pbmZvIHx8IHJlZ2lzdHJ5LmdldEluc3RhbmNlRm9yS2luZCh0aGlzLmdldEtpbmQoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0SW5mb0ZvclNpZ25hdHVyZTogZnVuY3Rpb24oc2lnbmF0dXJlKSB7XG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XG4gICAgICAgICAgICBpZighZXh0cmEuc2lnbmF0dXJlcylcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIHJldHVybiBleHRyYS5zaWduYXR1cmVzW3NpZ25hdHVyZV07XG4gICAgICAgIH0sXG4gICAgICAgIHNldEluZm9Gb3JTaWduYXR1cmU6IGZ1bmN0aW9uKHNpZ25hdHVyZSwgaW5mbykge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgaWYoIWV4dHJhLnNpZ25hdHVyZXMpXG4gICAgICAgICAgICAgICAgZXh0cmEuc2lnbmF0dXJlcyA9IHt9O1xuICAgICAgICAgICAgcmV0dXJuIGV4dHJhLnNpZ25hdHVyZXNbc2lnbmF0dXJlXSA9IGluZm87XG4gICAgICAgIH1cblxuXG4gICAgfSlcblxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtDb250ZXh0fG51bGx9IHBhcmVudFxuICAgICAqIEBwYXJhbSBvcHRcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICB2YXIgQ29udGV4dCA9IGZ1bmN0aW9uKG5vZGUsIHBhcmVudCwgb3B0KSB7XG4gICAgICAgIG9wdCA9IG9wdCB8fCB7fTtcblxuICAgICAgICAvKiogQHR5cGUgKENvbnRleHR8bnVsbCkgKi9cbiAgICAgICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQgfHwgb3B0LnBhcmVudCB8fCBudWxsO1xuICAgICAgICB0aGlzLnJlZ2lzdGVyeSA9IHBhcmVudCA/IHBhcmVudC5yZWdpc3RlcnkgOiB7fTtcblxuICAgICAgICB0aGlzLmNvbnRleHQgPSBub2RlLmNvbnRleHQgPSBub2RlLmNvbnRleHQgfHwge307XG5cbiAgICAgICAgLyoqIEB0eXBlIHtPYmplY3QuPHN0cmluZywge2luaXRpYWxpemVkOiBib29sZWFuLCBhbm5vdGF0aW9uOiBBbm5vdGF0aW9ufT59ICovXG4gICAgICAgIHRoaXMuY29udGV4dC5iaW5kaW5ncyA9IHRoaXMuY29udGV4dC5iaW5kaW5ncyB8fCB7fTtcbiAgICAgICAgaWYob3B0LmJpbmRpbmdzKSB7XG4gICAgICAgICAgICBCYXNlLmV4dGVuZCh0aGlzLmNvbnRleHQuYmluZGluZ3MsIG9wdC5iaW5kaW5ncyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbnRleHQubmFtZSA9IG9wdC5uYW1lIHx8IG5vZGUubmFtZSB8fCBcIjxhbm9ueW1vdXM+XCI7XG5cbiAgICB9O1xuXG4gICAgQmFzZS5leHRlbmQoQ29udGV4dC5wcm90b3R5cGUsIHtcblxuICAgICAgICBnZXROYW1lOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnRleHQubmFtZTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRCaW5kaW5nczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb250ZXh0LmJpbmRpbmdzO1xuICAgICAgICB9LFxuXG4gICAgICAgIHVwZGF0ZVJldHVybkluZm86IGZ1bmN0aW9uKGFubm90YXRpb24pIHtcbiAgICAgICAgICAgIHRoaXMuY29udGV4dC5yZXR1cm5JbmZvID0gYW5ub3RhdGlvbi5nZXRFeHRyYSgpO1xuICAgICAgICB9LFxuICAgICAgICBnZXRSZXR1cm5JbmZvOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnRleHQucmV0dXJuSW5mbztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAgICAgICAgICogQHJldHVybnMgeyp9XG4gICAgICAgICAqL1xuICAgICAgICBnZXRCaW5kaW5nQnlOYW1lOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgICAgICB2YXIgYmluZGluZ3MgPSB0aGlzLmdldEJpbmRpbmdzKCk7XG4gICAgICAgICAgICB2YXIgYmluZGluZyA9IGJpbmRpbmdzW25hbWVdO1xuICAgICAgICAgICAgaWYoYmluZGluZyAhPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQmluZGluZyhiaW5kaW5nLCB0aGlzLnJlZ2lzdGVyeSk7XG4gICAgICAgICAgICBpZiAodGhpcy5wYXJlbnQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50LmdldEJpbmRpbmdCeU5hbWUobmFtZSk7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICAgICAgICAgKiBAcmV0dXJucyB7Q29udGV4dHxudWxsfVxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0Q29udGV4dEZvck5hbWU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgICAgIHZhciBiaW5kaW5ncyA9IHRoaXMuZ2V0QmluZGluZ3MoKTtcbiAgICAgICAgICAgIGlmKGJpbmRpbmdzW25hbWVdICE9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICBpZiAodGhpcy5wYXJlbnQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50LmdldENvbnRleHRGb3JOYW1lKG5hbWUpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0VmFyaWFibGVJZGVudGlmaWVyOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgICAgICB2YXIgY29udGV4dCA9IHRoaXMuZ2V0Q29udGV4dEZvck5hbWUobmFtZSk7XG4gICAgICAgICAgICBpZighY29udGV4dClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIHJldHVybiBjb250ZXh0LnN0cigpICsgXCIuXCIgKyBuYW1lO1xuICAgICAgICB9LFxuXG4gICAgICAgIGRlY2xhcmVWYXJpYWJsZTogZnVuY3Rpb24obmFtZSwgZmFpbCwgcG9zaXRpb24pIHtcbiAgICAgICAgICAgIHZhciBiaW5kaW5ncyA9IHRoaXMuZ2V0QmluZGluZ3MoKTtcbiAgICAgICAgICAgIGZhaWwgPSAoZmFpbCA9PSB1bmRlZmluZWQpID8gdHJ1ZSA6IGZhaWw7XG4gICAgICAgICAgICBpZiAoYmluZGluZ3NbbmFtZV0pIHtcbiAgICAgICAgICAgICAgICBpZiAoZmFpbCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobmFtZSArIFwiIHdhcyBhbHJlYWR5IGRlY2xhcmVkIGluIHRoaXMgc2NvcGUuXCIpXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGluaXQgPSB7XG4gICAgICAgICAgICAgICAgaW5pdGlhbGl6ZWQgOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBpbml0UG9zaXRpb246IHBvc2l0aW9uLFxuICAgICAgICAgICAgICAgIGV4dHJhOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRZUEVTLlVOREVGSU5FRFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBiaW5kaW5nc1tuYW1lXSA9IGluaXQ7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAgICAgICAgICogQHBhcmFtIHtUeXBlSW5mb30gdHlwZUluZm9cbiAgICAgICAgICovXG4gICAgICAgIHVwZGF0ZUV4cHJlc3Npb246IGZ1bmN0aW9uIChuYW1lLCB0eXBlSW5mbykge1xuICAgICAgICAgICAgdmFyIHYgPSB0aGlzLmdldEJpbmRpbmdCeU5hbWUobmFtZSk7XG4gICAgICAgICAgICBpZiAoIXYpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJWYXJpYWJsZSB3YXMgbm90IGRlY2xhcmVkIGluIHRoaXMgc2NvcGU6IFwiICsgbmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodi5pc0luaXRpYWxpemVkKCkgJiYgdi5nZXRUeXBlKCkgIT09IHR5cGVJbmZvLmdldFR5cGUoKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlZhcmlhYmxlIG1heSBub3QgY2hhbmdlIGl0J3MgdHlwZTogXCIgKyBuYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdi5pc0luaXRpYWxpemVkKCkpIHtcbiAgICAgICAgICAgICAgICAvLyBBbm5vdGF0ZSB0aGUgZGVjbGFyYXRpb24sIGlmIG9uZSBpcyBnaXZlblxuICAgICAgICAgICAgICAgIGlmKHYubm9kZS5pbml0UG9zaXRpb24pXG4gICAgICAgICAgICAgICAgICAgIHYubm9kZS5pbml0UG9zaXRpb24uY29weSh0eXBlSW5mbyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHYuY29weSh0eXBlSW5mbyk7XG4gICAgICAgICAgICB2LnNldER5bmFtaWNWYWx1ZSgpO1xuICAgICAgICAgICAgdi5zZXRJbml0aWFsaXplZCghdHlwZUluZm8uaXNVbmRlZmluZWQoKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVnaXN0ZXJPYmplY3Q6IGZ1bmN0aW9uKG5hbWUsIG9iaikge1xuICAgICAgICAgICAgdGhpcy5yZWdpc3Rlcnlbb2JqLmlkXSA9IG9iajtcbiAgICAgICAgICAgIHZhciBiaW5kaW5ncyA9IHRoaXMuZ2V0QmluZGluZ3MoKTtcbiAgICAgICAgICAgIGJpbmRpbmdzW25hbWVdID0ge1xuICAgICAgICAgICAgICAgIGV4dHJhOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRZUEVTLk9CSkVDVFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVmOiBvYmouaWRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGVjbGFyZVBhcmFtZXRlcnM6IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgICAgICAgICAgdmFyIGJpbmRpbmdzID0gdGhpcy5nZXRCaW5kaW5ncygpO1xuICAgICAgICAgICAgdGhpcy5wYXJhbXMgPSBbXTtcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBwYXJhbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgcGFyYW1ldGVyID0gcGFyYW1zW2ldO1xuICAgICAgICAgICAgICAgIHRoaXMucGFyYW1zW2ldID0gcGFyYW1ldGVyLm5hbWU7XG4gICAgICAgICAgICAgICAgYmluZGluZ3NbcGFyYW1ldGVyLm5hbWVdID0geyB0eXBlOiBUWVBFUy5VTkRFRklORUQgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtBcnJheS48VHlwZUluZm8+fSA8cGFyYW1zXG4gICAgICAgICAqL1xuICAgICAgICBpbmplY3RQYXJhbWV0ZXJzOiBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGk8IHBhcmFtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChpID09IHRoaXMucGFyYW1zLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgdmFyIG5hbWUgPSB0aGlzLnBhcmFtc1tpXTtcbiAgICAgICAgICAgICAgICB2YXIgYmluZGluZ3MgPSB0aGlzLmdldEJpbmRpbmdzKCk7XG4gICAgICAgICAgICAgICAgYmluZGluZ3NbbmFtZV0gPSB7IGV4dHJhOiB7fSB9O1xuICAgICAgICAgICAgICAgIEJhc2UuZGVlcEV4dGVuZChiaW5kaW5nc1tuYW1lXS5leHRyYSwgcGFyYW1zW2ldLmdldEV4dHJhKCkpO1xuICAgICAgICAgICAgICAgIGlmIChwYXJhbXNbaV0uZ2V0Tm9kZUluZm8oKSkge1xuICAgICAgICAgICAgICAgICAgICBiaW5kaW5nc1tuYW1lXS5pbmZvID0ge307XG4gICAgICAgICAgICAgICAgICAgIEJhc2UuZGVlcEV4dGVuZChiaW5kaW5nc1tuYW1lXS5pbmZvLCBwYXJhbXNbaV0uZ2V0Tm9kZUluZm8oKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIHN0cjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgY3R4ID0gdGhpcztcbiAgICAgICAgICAgIHZhciBuYW1lcyA9IFtdO1xuICAgICAgICAgICAgd2hpbGUoY3R4KSB7XG4gICAgICAgICAgICAgICAgbmFtZXMudW5zaGlmdChjdHguZ2V0TmFtZSgpKTtcbiAgICAgICAgICAgICAgICBjdHggPSBjdHgucGFyZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG5hbWVzLmpvaW4oXCIuXCIpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldEFsbEJpbmRpbmdzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBPYmplY3Qua2V5cyh0aGlzLmdldEJpbmRpbmdzKCkpO1xuICAgICAgICAgICAgaWYgKHRoaXMucGFyZW50KSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhcmVudEJpbmRpbmdzID0gdGhpcy5wYXJlbnQuZ2V0QWxsQmluZGluZ3MoKTtcbiAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgcGFyZW50QmluZGluZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5pbmRleE9mKHBhcmVudEJpbmRpbmdzW2ldKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKHBhcmVudEJpbmRpbmdzW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBub2RlXG4gICAgICAgICAqIEByZXR1cm5zIHtUeXBlSW5mb31cbiAgICAgICAgICovXG4gICAgICAgIGNyZWF0ZVR5cGVJbmZvOiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdC5nZXRUeXBlKCkgIT09IFRZUEVTLkFOWSkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChub2RlLnR5cGUgPT0gU3ludGF4LklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IG5vZGUubmFtZTtcbiAgICAgICAgICAgICAgICB2YXIgYmluZGluZyA9IHRoaXMuZ2V0QmluZGluZ0J5TmFtZShuYW1lKTtcbiAgICAgICAgICAgICAgICBpZiAoIWJpbmRpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIlJlZmVyZW5jZUVycm9yOiBcIiArIG5hbWUgKyBcIiBpcyBub3QgZGVmaW5lZFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJpbmRpbmc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldE9iamVjdEluZm9Gb3I6IGZ1bmN0aW9uKG9iaikge1xuICAgICAgICAgICAgaWYgKCFvYmouaXNPYmplY3QoKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcblxuICAgICAgICAgICAgLyogVGhlIFR5cGVJbmZvIG1pZ2h0IGtub3cgYWJvdXQgaXQncyBvYmplY3QgdHlwZSAqL1xuICAgICAgICAgICAgaWYgKG9iai5nZXRPYmplY3RJbmZvKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iai5nZXRPYmplY3RJbmZvKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgbm9kZUluZm8gPSBvYmouZ2V0Tm9kZUluZm8oKTtcbiAgICAgICAgICAgIGlmIChub2RlSW5mbykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJGb3VuZCBOb2RlSW5mb1wiKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZUluZm87XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVnaXN0cnkuZ2V0SW5zdGFuY2VGb3JLaW5kKG9iai5nZXRLaW5kKCkpXG4gICAgICAgIH1cblxuICAgIH0pO1xuXG5cbiAgICAgICAgcmV0dXJuIENvbnRleHQ7XG5cbiAgICB9O1xuXG5cblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgbnMuZXh0ZW5kID0gZnVuY3Rpb24oYSwgYikge1xuICAgICAgICBmb3IgKCB2YXIgcHJvcCBpbiBiKSB7XG4gICAgICAgICAgICB2YXIgZyA9IGIuX19sb29rdXBHZXR0ZXJfXyhwcm9wKSwgcyA9IGIuX19sb29rdXBTZXR0ZXJfXyhwcm9wKTtcbiAgICAgICAgICAgIGlmIChnfHxzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGcpIHtcbiAgICAgICAgICAgICAgICAgICAgYS5fX2RlZmluZUdldHRlcl9fKHByb3AsIGcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocykge1xuICAgICAgICAgICAgICAgICAgICBhLl9fZGVmaW5lU2V0dGVyX18ocHJvcCwgcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoYltwcm9wXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBhW3Byb3BdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcCAhPT0gXCJjb25zdHJ1Y3RvclwiIHx8IGEgIT09IHdpbmRvdykge1xuICAgICAgICAgICAgICAgICAgICBhW3Byb3BdID0gYltwcm9wXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGE7XG4gICAgfTtcblxuICAgIG5zLmRlZXBFeHRlbmQgPSBmdW5jdGlvbihkZXN0aW5hdGlvbiwgc291cmNlKSB7XG4gICAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIHNvdXJjZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzb3VyY2VbcHJvcGVydHldID09PSBcIm9iamVjdFwiICYmIHNvdXJjZVtwcm9wZXJ0eV0gIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBkZXN0aW5hdGlvbltwcm9wZXJ0eV0gPSBkZXN0aW5hdGlvbltwcm9wZXJ0eV0gfHwge307XG4gICAgICAgICAgICAgICAgbnMuZGVlcEV4dGVuZChkZXN0aW5hdGlvbltwcm9wZXJ0eV0sIHNvdXJjZVtwcm9wZXJ0eV0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZXN0aW5hdGlvbltwcm9wZXJ0eV0gPSBzb3VyY2VbcHJvcGVydHldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGN0b3IgQ29uc3RydWN0b3JcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyZW50IFBhcmVudCBjbGFzc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0PX0gbWV0aG9kcyBNZXRob2RzIHRvIGFkZCB0byB0aGUgY2xhc3NcbiAgICAgKiBAcmV0dXJuIHtPYmplY3QhfVxuICAgICAqL1xuICAgIG5zLmNyZWF0ZUNsYXNzID0gZnVuY3Rpb24oY3RvciwgcGFyZW50LCBtZXRob2RzKSB7XG4gICAgICAgIG1ldGhvZHMgPSBtZXRob2RzIHx8IHt9O1xuICAgICAgICBpZiAocGFyZW50KSB7XG4gICAgICAgICAgICAvKiogQGNvbnN0cnVjdG9yICovXG4gICAgICAgICAgICB2YXIgRiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIEYucHJvdG90eXBlID0gcGFyZW50LnByb3RvdHlwZTtcbiAgICAgICAgICAgIGN0b3IucHJvdG90eXBlID0gbmV3IEYoKTtcbiAgICAgICAgICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvcjtcbiAgICAgICAgICAgIGN0b3Iuc3VwZXJjbGFzcyA9IHBhcmVudC5wcm90b3R5cGU7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICggdmFyIG0gaW4gbWV0aG9kcykge1xuICAgICAgICAgICAgY3Rvci5wcm90b3R5cGVbbV0gPSBtZXRob2RzW21dO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdG9yO1xuICAgIH07XG5cblxufShleHBvcnRzKSlcbiIsIihmdW5jdGlvbihucyl7XG5cbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheCxcbiAgICAgICAgQmFzZSA9IHJlcXVpcmUoXCIuL2luZGV4LmpzXCIpO1xuXG4gICAgdmFyIFRZUEVTID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTO1xuXG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0geyp9IG5vZGUgQ2FycmllciBvYmplY3QgZm9yIHRoZSB0eXBlIGluZm8sIG9ubHkgbm9kZS5leHRyYSBnZXRzIHBvbGx1dGVkXG4gICAgICogQHBhcmFtIHtPYmplY3Q/fSBleHRyYVxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIHZhciBUeXBlSW5mbyA9IGZ1bmN0aW9uIChub2RlLCBleHRyYSkge1xuICAgICAgICB0aGlzLm5vZGUgPSBub2RlO1xuICAgICAgICB0aGlzLm5vZGUuZXh0cmEgPSB0aGlzLm5vZGUuZXh0cmEgfHwge307XG4gICAgICAgIGlmIChleHRyYSkge1xuICAgICAgICAgICAgQmFzZS5kZWVwRXh0ZW5kKHRoaXMubm9kZS5leHRyYSwgZXh0cmEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgVHlwZUluZm8uY3JlYXRlRm9yQ29udGV4dCA9IGZ1bmN0aW9uKG5vZGUsIGN0eCkge1xuICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IFR5cGVJbmZvKG5vZGUpO1xuICAgICAgICBpZiAocmVzdWx0LmdldFR5cGUoKSAhPT0gVFlQRVMuQU5ZKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5vZGUudHlwZSA9PSBTeW50YXguSWRlbnRpZmllcikge1xuICAgICAgICAgICAgdmFyIG5hbWUgPSBub2RlLm5hbWU7XG4gICAgICAgICAgICB2YXIgdmFyaWFibGUgPSBjdHguZ2V0QmluZGluZ0J5TmFtZShuYW1lKTtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVHlwZUluZm8obm9kZSwgdmFyaWFibGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgVHlwZUluZm8ucHJvdG90eXBlID0ge1xuICAgICAgICBnZXRFeHRyYTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubm9kZS5leHRyYTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0VHlwZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgaWYgKGV4dHJhLnR5cGUgIT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIHJldHVybiBleHRyYS50eXBlO1xuICAgICAgICAgICAgcmV0dXJuIFRZUEVTLkFOWTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZXRLaW5kOiBmdW5jdGlvbiAoa2luZCkge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgZXh0cmEua2luZCA9IGtpbmQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0S2luZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmlzT2JqZWN0KCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRFeHRyYSgpLmtpbmQgfHwgS0lORFMuQU5ZO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldEFycmF5RWxlbWVudFR5cGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmKCF0aGlzLmlzQXJyYXkoKSlcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYWxsZWQgZ2V0QXJyYXlFbGVtZW50VHlwZSBvbiBcIiArIHRoaXMuZ2V0VHlwZSgpKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEV4dHJhKCkuZWxlbWVudHM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNPZktpbmQ6IGZ1bmN0aW9uKGtpbmQpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5pc09iamVjdCgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0S2luZCgpID09IGtpbmQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nP30ga2luZFxuICAgICAgICAgKi9cbiAgICAgICAgc2V0VHlwZTogZnVuY3Rpb24gKHR5cGUsIGtpbmQpIHtcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcbiAgICAgICAgICAgIGV4dHJhLnR5cGUgPSB0eXBlO1xuICAgICAgICAgICAgaWYgKGtpbmQpXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRLaW5kKGtpbmQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzT2ZUeXBlOiBmdW5jdGlvbiAodHlwZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VHlwZSgpID09IHR5cGU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZXF1YWxzOiBmdW5jdGlvbiAob3RoZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldFR5cGUoKSA9PSBvdGhlci5nZXRUeXBlKCkgJiYgdGhpcy5nZXRLaW5kKCkgPT0gb3RoZXIuZ2V0S2luZCgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzSW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09mVHlwZShUWVBFUy5JTlQpO1xuICAgICAgICB9LFxuICAgICAgICBpc051bWJlcjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNPZlR5cGUoVFlQRVMuTlVNQkVSKTtcbiAgICAgICAgfSxcbiAgICAgICAgaXNOdWxsT3JVbmRlZmluZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzTnVsbCgpIHx8IHRoaXMuaXNVbmRlZmluZWQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgaXNOdWxsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09mVHlwZShUWVBFUy5OVUxMKTtcbiAgICAgICAgfSxcbiAgICAgICAgaXNVbmRlZmluZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzT2ZUeXBlKFRZUEVTLlVOREVGSU5FRCk7XG4gICAgICAgIH0sXG4gICAgICAgIGlzQm9vbDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNPZlR5cGUoVFlQRVMuQk9PTEVBTik7XG4gICAgICAgIH0sXG4gICAgICAgIGlzU3RyaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09mVHlwZShUWVBFUy5TVFJJTkcpO1xuICAgICAgICB9LFxuICAgICAgICBpc0FycmF5OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09mVHlwZShUWVBFUy5BUlJBWSk7XG4gICAgICAgIH0sXG4gICAgICAgIGlzRnVuY3Rpb246IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzT2ZUeXBlKFRZUEVTLkZVTkNUSU9OKTtcbiAgICAgICAgfSxcbiAgICAgICAgaXNPYmplY3Q6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzT2ZUeXBlKFRZUEVTLk9CSkVDVCk7XG4gICAgICAgIH0sXG4gICAgICAgIGlzR2xvYmFsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiAhIXRoaXMuZ2V0RXh0cmEoKS5nbG9iYWw7XG4gICAgICAgIH0sXG4gICAgICAgIHNldEdsb2JhbDogZnVuY3Rpb24gKGdsb2JhbCkge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgZXh0cmEuZ2xvYmFsID0gZ2xvYmFsO1xuICAgICAgICB9LFxuICAgICAgICBjYW5OdW1iZXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzTnVtYmVyKCkgfHwgdGhpcy5pc0ludCgpIHx8IHRoaXMuaXNCb29sKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGNhbkludDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNJbnQoKSB8fCB0aGlzLmlzQm9vbCgpO1xuICAgICAgICB9LFxuICAgICAgICBoYXNTdGF0aWNWYWx1ZSA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNOdWxsT3JVbmRlZmluZWQoKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybiBleHRyYS5oYXNPd25Qcm9wZXJ0eShcInN0YXRpY1ZhbHVlXCIpO1xuICAgICAgICB9LFxuICAgICAgICBzZXRTdGF0aWNWYWx1ZSA6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzTnVsbE9yVW5kZWZpbmVkKCkpXG4gICAgICAgICAgICAgICAgdGhyb3coXCJOdWxsIGFuZCB1bmRlZmluZWQgaGF2ZSBwcmVkZWZpbmVkIHZhbHVlcy5cIik7XG4gICAgICAgICAgICBleHRyYS5zdGF0aWNWYWx1ZSA9IHY7XG4gICAgICAgIH0sXG4gICAgICAgIGdldFN0YXRpY1ZhbHVlIDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuaGFzU3RhdGljVmFsdWUoKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vZGUgaGFzIG5vIHN0YXRpYyB2YWx1ZTogXCIgKyB0aGlzLm5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuaXNOdWxsKCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICBpZiAodGhpcy5pc1VuZGVmaW5lZCgpKVxuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRFeHRyYSgpLnN0YXRpY1ZhbHVlO1xuICAgICAgICB9LFxuICAgICAgICBzZXREeW5hbWljVmFsdWUgOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmdldEV4dHJhKCkuc3RhdGljVmFsdWU7XG4gICAgICAgIH0sXG4gICAgICAgIHNldENhbGwgOiBmdW5jdGlvbihjYWxsKSB7XG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XG4gICAgICAgICAgICBleHRyYS5ldmFsdWF0ZSA9IGNhbGw7XG4gICAgICAgIH0sXG4gICAgICAgIGdldENhbGwgOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEV4dHJhKCkuZXZhbHVhdGU7XG4gICAgICAgIH0sXG4gICAgICAgIGNsZWFyQ2FsbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XG4gICAgICAgICAgICBkZWxldGUgZXh0cmEuZXZhbHVhdGU7XG4gICAgICAgIH0sXG4gICAgICAgIGNvcHk6IGZ1bmN0aW9uKG90aGVyKSB7XG4gICAgICAgICAgICBCYXNlLmRlZXBFeHRlbmQodGhpcy5ub2RlLmV4dHJhLCBvdGhlci5nZXRFeHRyYSgpKTtcbiAgICAgICAgfSxcbiAgICAgICAgc3RyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcbiAgICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShleHRyYSwgbnVsbCwgMSk7XG4gICAgICAgIH0sXG4gICAgICAgIGNhbk5vcm1hbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09iamVjdCgpICYmICh0aGlzLmlzT2ZLaW5kKEtJTkRTLk5PUk1BTCkgfHwgdGhpcy5pc09mS2luZChLSU5EUy5GTE9BVDMpKTtcbiAgICAgICAgfSxcbiAgICAgICAgY2FuQ29sb3I6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNPYmplY3QoKSAmJiAodGhpcy5pc09mS2luZChLSU5EUy5GTE9BVDQpIHx8IHRoaXMuaXNPZktpbmQoS0lORFMuRkxPQVQzKSk7XG4gICAgICAgIH0sXG4gICAgICAgIGVsaW1pbmF0ZSA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgZXh0cmEuZWxpbWluYXRlID0gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgY2FuRWxpbWluYXRlIDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XG4gICAgICAgICAgICByZXR1cm4gZXh0cmEuZWxpbWluYXRlID09IHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIHNldEZyb21FeHRyYTogZnVuY3Rpb24oZXh0cmEpe1xuICAgICAgICAgICAgdGhpcy5zZXRUeXBlKGV4dHJhLnR5cGUpO1xuICAgICAgICAgICAgaWYgKGV4dHJhLmtpbmQgIT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIHRoaXMuc2V0S2luZChleHRyYS5raW5kKTtcbiAgICAgICAgICAgIHRoaXMuc2V0R2xvYmFsKGV4dHJhLmdsb2JhbCk7XG4gICAgICAgICAgICBpZiAoZXh0cmEuc3RhdGljVmFsdWUgIT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGljVmFsdWUoZXh0cmEuc3RhdGljVmFsdWUpO1xuICAgICAgICAgICAgaWYgKGV4dHJhLmV2YWx1YXRlICE9IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICB0aGlzLnNldENhbGwoZXh0cmEuZXZhbHVhdGUpO1xuICAgICAgICAgICAgaWYgKGV4dHJhLnNvdXJjZSAhPSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRTb3VyY2UoZXh0cmEuc291cmNlKTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0Tm9kZUluZm86IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNPYmplY3QoKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5ub2RlLmluZm87XG4gICAgICAgIH0sXG4gICAgICAgIGdldFR5cGVTdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNPYmplY3QoKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJPYmplY3QgIzxcIiArIHRoaXMuZ2V0S2luZCgpICsgXCI+XCI7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRUeXBlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldFNvdXJjZTogZnVuY3Rpb24oc291cmNlKSB7XG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XG4gICAgICAgICAgICBleHRyYS5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICAgIH0sXG4gICAgICAgIGdldFNvdXJjZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRFeHRyYSgpLnNvdXJjZTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgbnMuVHlwZUluZm8gPSBUeXBlSW5mbztcblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgbnMuc3dpenpsZVRvSW5kZXggPSBmdW5jdGlvbihzd2l6emxlS2V5KXtcbiAgICAgICAgc3dpdGNoKHN3aXp6bGVLZXkpe1xuICAgICAgICAgICAgY2FzZSAneCc6Y2FzZSAncicgOmNhc2UgJ3MnOiByZXR1cm4gMDtcbiAgICAgICAgICAgIGNhc2UgJ3knOmNhc2UgJ2cnIDpjYXNlICd0JzogcmV0dXJuIDE7XG4gICAgICAgICAgICBjYXNlICd6JzpjYXNlICdiJyA6Y2FzZSAncCc6IHJldHVybiAyO1xuICAgICAgICAgICAgY2FzZSAndyc6Y2FzZSAnYScgOmNhc2UgJ3EnOiByZXR1cm4gMztcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIHN3aXp6bGUga2V5OiAnXCIgKyBzd2l6emxlS2V5ICsgXCInXCIpO1xuICAgIH07XG4gICAgbnMuaW5kZXhUb1N3aXp6bGUgPSBmdW5jdGlvbihpbmRleCl7XG4gICAgICAgIHN3aXRjaChpbmRleCl7XG4gICAgICAgICAgICBjYXNlIDA6IHJldHVybiAneCc7XG4gICAgICAgICAgICBjYXNlIDE6IHJldHVybiAneSc7XG4gICAgICAgICAgICBjYXNlIDI6IHJldHVybiAneic7XG4gICAgICAgICAgICBjYXNlIDM6IHJldHVybiAndyc7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biBzd2l6emxlIGluZGV4OiAnXCIgKyBpbmRleCArIFwiJ1wiKTtcbiAgICB9O1xuICAgIG5zLnN3aXp6bGVTZXRzID0gW1xuICAgICAgICBbJ3gnLCAneScsICd6JywgJ3cnXSxcbiAgICAgICAgWydyJywgJ2cnLCAnYicsICdhJ10sXG4gICAgICAgIFsncycsICd0JywgJ3AnLCAncSddXG4gICAgXTtcblxufShleHBvcnRzKSlcbiIsIihmdW5jdGlvbiAobnMpIHtcblxuICAgIHZhciBCYXNlID0gcmVxdWlyZShcIi4uLy4uL2Jhc2UvaW5kZXguanNcIik7XG5cbiAgICB2YXIgVHJhbnNmb3JtZXIgPSByZXF1aXJlKFwiLi90cmFuc2Zvcm0uanNcIikuR0xBU1RUcmFuc2Zvcm1lcjtcbiAgICB2YXIgZ2VuZXJhdGUgPSByZXF1aXJlKFwiLi9nbHNsLWdlbmVyYXRlLmpzXCIpLmdlbmVyYXRlO1xuXG4gICAgdmFyIEdMU0xDb21waWxlciA9IGZ1bmN0aW9uICgpIHtcblxuICAgIH07XG5cbiAgICBCYXNlLmV4dGVuZChHTFNMQ29tcGlsZXIucHJvdG90eXBlLCB7XG5cbiAgICAgICAgY29tcGlsZUZyYWdtZW50U2hhZGVyOiBmdW5jdGlvbiAoYWFzdCwgb3B0KSB7XG5cbiAgICAgICAgICAgIHZhciB0cmFuc2Zvcm1lciA9IG5ldyBUcmFuc2Zvcm1lcihcImdsb2JhbC5zaGFkZVwiKTtcblxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhYXN0LCAwLCBcIiBcIikpO1xuXG4gICAgICAgICAgICB2YXIgdHJhbnNmb3JtZWQgPSB0cmFuc2Zvcm1lci50cmFuc2Zvcm1BQVNUKGFhc3QpO1xuXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGFhc3QsIDAsIFwiIFwiKSk7XG5cbiAgICAgICAgICAgIHZhciBjb2RlID0gZ2VuZXJhdGUodHJhbnNmb3JtZWQsIG9wdCk7XG5cbiAgICAgICAgICAgIHJldHVybiBjb2RlO1xuICAgICAgICB9XG5cbiAgICB9KTtcblxuXG4gICAgbnMuR0xTTENvbXBpbGVyID0gR0xTTENvbXBpbGVyO1xuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbiAobnMpIHtcblxuICAgIHZhciBGdW5jdGlvbkFubm90YXRpb24gPSByZXF1aXJlKFwiLi8uLi8uLi9iYXNlL2Fubm90YXRpb24uanNcIikuRnVuY3Rpb25Bbm5vdGF0aW9uO1xuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLy4uLy4uL2ludGVyZmFjZXMuanNcIik7XG4gICAgdmFyIHdhbGsgPSByZXF1aXJlKCdlc3RyYXZlcnNlJyksXG4gICAgICAgIFN5bnRheCA9IHdhbGsuU3ludGF4LFxuICAgICAgICBWaXNpdG9yT3B0aW9uID0gd2Fsay5WaXNpdG9yT3B0aW9uO1xuXG4gICAgdmFyIFR5cGVzID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEtpbmRzID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxuICAgICAgICBTb3VyY2VzID0gU2hhZGUuU09VUkNFUztcblxuXG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0XG4gICAgICovXG4gICAgdmFyIGdldEhlYWRlciA9IGZ1bmN0aW9uIChvcHQpIHtcbiAgICAgICAgaWYgKG9wdC5vbWl0SGVhZGVyID09IHRydWUpXG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIHZhciBoZWFkZXIgPSBbXG4gICAgICAgICAgICBcIi8vIEdlbmVyYXRlZCBieSBzaGFkZS5qc1wiXG4gICAgICAgIF07XG4gICAgICAgIHZhciBmbG9hdFByZWNpc2lvbiA9IG9wdC5mbG9hdFByZWNpc2lvbiB8fCBcIm1lZGl1bXBcIjtcbiAgICAgICAgaGVhZGVyLnB1c2goXCJwcmVjaXNpb24gXCIgKyBmbG9hdFByZWNpc2lvbiArIFwiIGZsb2F0O1wiKTtcbiAgICAgICAgcmV0dXJuIGhlYWRlcjtcbiAgICB9XG5cbiAgICB2YXIgdG9HTFNMVHlwZSA9IGZ1bmN0aW9uIChpbmZvLCBhbGxvd1VuZGVmaW5lZCkge1xuICAgICAgICBzd2l0Y2ggKGluZm8udHlwZSkge1xuICAgICAgICAgICAgY2FzZSBUeXBlcy5PQkpFQ1Q6XG4gICAgICAgICAgICAgICAgc3dpdGNoIChpbmZvLmtpbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLaW5kcy5GTE9BVDQ6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJ2ZWM0XCI7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS2luZHMuRkxPQVQzOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwidmVjM1wiO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIEtpbmRzLkZMT0FUMjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcInZlYzJcIjtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcIjx1bmRlZmluZWQ+XCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBUeXBlcy5VTkRFRklORUQ6XG4gICAgICAgICAgICAgICAgaWYgKGFsbG93VW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJ2b2lkXCI7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IGRldGVybWluZSB0eXBlXCIpO1xuICAgICAgICAgICAgY2FzZSBUeXBlcy5OVU1CRVI6XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiZmxvYXRcIjtcbiAgICAgICAgICAgIGNhc2UgVHlwZXMuQk9PTEVBTjpcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJib29sXCI7XG4gICAgICAgICAgICBjYXNlIFR5cGVzLklOVDpcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJpbnRcIjtcbiAgICAgICAgICAgIGNhc2UgVHlwZXMuQk9PTEVBTjpcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJib29sXCI7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInRvR0xTTFR5cGU6IFVuaGFuZGxlZCB0eXBlOiBcIiArIGluZm8udHlwZSk7XG5cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciB0b0dMU0xTb3VyY2UgPSBmdW5jdGlvbihpbmZvKSB7XG4gICAgICAgIGlmICghaW5mby5zb3VyY2UpXG4gICAgICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgICAgaWYgKGluZm8uc291cmNlID09IFNvdXJjZXMuVkVSVEVYKVxuICAgICAgICAgICAgcmV0dXJuIFwidmFyeWluZ1wiO1xuICAgICAgICBpZiAoaW5mby5zb3VyY2UgPT0gU291cmNlcy5VTklGT1JNKVxuICAgICAgICAgICAgcmV0dXJuIFwidW5pZm9ybVwiO1xuICAgICAgICBpZiAoaW5mby5zb3VyY2UgPT0gU291cmNlcy5DT05TVEFOVClcbiAgICAgICAgICAgIHJldHVybiBcImNvbnN0XCI7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInRvR0xTTFNvdXJjZTogVW5oYW5kbGVkIHR5cGU6IFwiICsgaW5mby5zb3VyY2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUxpbmVTdGFjaygpIHtcbiAgICAgICAgdmFyIGFyciA9IFtdO1xuICAgICAgICBhcnIucHVzaC5hcHBseShhcnIsIGFyZ3VtZW50cyk7XG4gICAgICAgIHZhciBpbmRlbnQgPSBcIlwiO1xuICAgICAgICBhcnIuYXBwZW5kTGluZSA9IGZ1bmN0aW9uKGxpbmUpe1xuICAgICAgICAgICAgdGhpcy5wdXNoKGluZGVudCArIGxpbmUpO1xuICAgICAgICB9O1xuICAgICAgICBhcnIuY2hhbmdlSW5kZW50aW9uID0gZnVuY3Rpb24oYWRkKXtcbiAgICAgICAgICAgIHdoaWxlKGFkZCA+IDApe1xuICAgICAgICAgICAgICAgIGluZGVudCArPSBcIiAgICBcIjsgYWRkLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZihhZGQgPCAwKXtcbiAgICAgICAgICAgICAgICBpbmRlbnQgPSBpbmRlbnQuc3Vic3RyKDAsIGluZGVudC5sZW5ndGggKyBhZGQqNCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGFyci5hcHBlbmQgPSBmdW5jdGlvbihzdHIpe1xuICAgICAgICAgICAgdGhpc1t0aGlzLmxlbmd0aC0xXSA9IHRoaXNbdGhpcy5sZW5ndGgtMV0gKyBzdHI7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBhcnI7XG4gICAgfTtcblxuXG4gICAgLypCYXNlLmV4dGVuZChMaW5lU3RhY2sucHJvdG90eXBlLCB7XG5cbiAgICB9KTsqL1xuXG4gICAgdmFyIGdlbmVyYXRlID0gZnVuY3Rpb24gKGFzdCwgb3B0KSB7XG5cbiAgICAgICAgb3B0ID0gb3B0IHx8IHt9O1xuXG4gICAgICAgIHZhciBpbmRlbnQgPSBcIlwiO1xuICAgICAgICB2YXIgbGluZXMgPSBjcmVhdGVMaW5lU3RhY2soKTtcblxuICAgICAgICB0cmF2ZXJzZShhc3QsIGxpbmVzLCBvcHQpO1xuXG4gICAgICAgIHJldHVybiBsaW5lcy5qb2luKFwiXFxuXCIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyYXZlcnNlKGFzdCwgbGluZXMsIG9wdCkge1xuICAgICAgICB3YWxrLnRyYXZlcnNlKGFzdCwge1xuICAgICAgICAgICAgICAgIGVudGVyOiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHR5cGUgPSBub2RlLnR5cGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlByb2dyYW06XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdldEhlYWRlcihvcHQpLmZvckVhY2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLnB1c2goZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZnVuYyA9IG5ldyBGdW5jdGlvbkFubm90YXRpb24obm9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtZXRob2RTdGFydCA9IFt0b0dMU0xUeXBlKGZ1bmMuZ2V0UmV0dXJuSW5mbygpLCB0cnVlKV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZFN0YXJ0LnB1c2gobm9kZS5pZC5uYW1lLCAnKCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIShub2RlLnBhcmFtcyAmJiBub2RlLnBhcmFtcy5sZW5ndGgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRob2RTdGFydC5wdXNoKFwidm9pZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUucGFyYW1zLmZvckVhY2goZnVuY3Rpb24gKHBhcmFtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kU3RhcnQucHVzaCh0b0dMU0xUeXBlKHBhcmFtLmV4dHJhKSwgcGFyYW0ubmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZFN0YXJ0LnB1c2goJykgeycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5hcHBlbmRMaW5lKG1ldGhvZFN0YXJ0LmpvaW4oXCIgXCIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuY2hhbmdlSW5kZW50aW9uKDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlJldHVyblN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGhhc0FyZ3VtZW50cyA9IG5vZGUuYXJndW1lbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmFwcGVuZExpbmUoXCJyZXR1cm4gXCIgKyAoaGFzQXJndW1lbnRzID8gaGFuZGxlRXhwcmVzc2lvbihub2RlLmFyZ3VtZW50KSA6IFwiXCIpICsgXCI7XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5WYXJpYWJsZURlY2xhcmF0b3IgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIk1lZXAhXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc291cmNlID0gdG9HTFNMU291cmNlKG5vZGUuZXh0cmEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbGluZSA9IHNvdXJjZSA/IHNvdXJjZSArIFwiIFwiIDogXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZSArPSB0b0dMU0xUeXBlKG5vZGUuZXh0cmEpICsgXCIgXCIgKyBub2RlLmlkLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmluaXQpIGxpbmUgKz0gXCIgPSBcIiArIGhhbmRsZUV4cHJlc3Npb24obm9kZS5pbml0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuYXBwZW5kTGluZShsaW5lICsgXCI7XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Bc3NpZ25tZW50RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuYXBwZW5kTGluZShoYW5kbGVFeHByZXNzaW9uKG5vZGUpICsgXCI7XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkV4cHJlc3Npb25TdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmFwcGVuZExpbmUoaGFuZGxlRXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24pICsgXCI7XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gVmlzaXRvck9wdGlvbi5Ta2lwO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguSWZTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmFwcGVuZExpbmUoXCJpZihcIiArIGhhbmRsZUV4cHJlc3Npb24obm9kZS50ZXN0KSArIFwiKSB7XCIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmNoYW5nZUluZGVudGlvbigxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhdmVyc2Uobm9kZS5jb25zZXF1ZW50LCBsaW5lcywgb3B0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuY2hhbmdlSW5kZW50aW9uKC0xKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5hbHRlcm5hdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmFwcGVuZExpbmUoXCJ9IGVsc2Uge1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmNoYW5nZUluZGVudGlvbigxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYXZlcnNlKG5vZGUuYWx0ZXJuYXRlLCBsaW5lcywgb3B0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmNoYW5nZUluZGVudGlvbigtMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuYXBwZW5kTGluZShcIn1cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBWaXNpdG9yT3B0aW9uLlNraXA7XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIlVuaGFuZGxlZDogXCIgKyB0eXBlKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKG5vZGUsIGUubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGxlYXZlOiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IG5vZGUudHlwZTtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Qcm9ncmFtOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5jaGFuZ2VJbmRlbnRpb24oLTEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmFwcGVuZExpbmUoXCJ9XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHZhciBnZW5lcmF0ZUZsb2F0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgaWYoaXNOYU4odmFsdWUpKVxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJJbnRlcm5hbDogRXhwcmVzc2lvbiBnZW5lcmF0ZWQgTmFOIVwiKTtcbiAgICAgICAgdmFyIHJlc3VsdCA9ICcnICsgdmFsdWU7XG4gICAgICAgIGlmIChyZXN1bHQuaW5kZXhPZihcIi5cIikgPT0gLTEpIHtcbiAgICAgICAgICAgIHJlc3VsdCArPSBcIi4wXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBub2RlXG4gICAgICogQHJldHVybnMge3N0cmluZ31cbiAgICAgKi9cbiAgICB2YXIgaGFuZGxlRXhwcmVzc2lvbiA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IFwiPHVuaGFuZGxlZDogXCIgKyBub2RlLnR5cGUrIFwiPlwiO1xuICAgICAgICBzd2l0Y2gobm9kZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5OZXdFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IHRvR0xTTFR5cGUobm9kZS5leHRyYSk7XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IGhhbmRsZUFyZ3VtZW50cyhub2RlLmFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkxpdGVyYWw6XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gbm9kZS5leHRyYS5zdGF0aWNWYWx1ZSAhPT0gdW5kZWZpbmVkID8gbm9kZS5leHRyYS5zdGF0aWNWYWx1ZSA6IG5vZGUudmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGUuZXh0cmEudHlwZSA9PSBUeXBlcy5OVU1CRVIpXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGdlbmVyYXRlRmxvYXQodmFsdWUpO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cblxuICAgICAgICAgICAgY2FzZSBTeW50YXguSWRlbnRpZmllcjpcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBub2RlLm5hbWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkJpbmFyeUV4cHJlc3Npb246XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Mb2dpY2FsRXhwcmVzc2lvbjpcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkFzc2lnbm1lbnRFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGhhbmRsZUJpbmFyeUFyZ3VtZW50KG5vZGUubGVmdCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IFwiIFwiICsgbm9kZS5vcGVyYXRvciArIFwiIFwiO1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBoYW5kbGVCaW5hcnlBcmd1bWVudChub2RlLnJpZ2h0KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlVuYXJ5RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBub2RlLm9wZXJhdG9yO1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBoYW5kbGVCaW5hcnlBcmd1bWVudChub2RlLmFyZ3VtZW50KTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBTeW50YXguQ2FsbEV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gaGFuZGxlRXhwcmVzc2lvbihub2RlLmNhbGxlZSk7XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IGhhbmRsZUFyZ3VtZW50cyhub2RlLmFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk1lbWJlckV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gaGFuZGxlRXhwcmVzc2lvbihub2RlLm9iamVjdCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IFwiLlwiO1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBoYW5kbGVFeHByZXNzaW9uKG5vZGUucHJvcGVydHkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Db25kaXRpb25hbEV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gaGFuZGxlRXhwcmVzc2lvbihub2RlLnRlc3QpO1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBcIiA/IFwiO1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBoYW5kbGVFeHByZXNzaW9uKG5vZGUuY29uc2VxdWVudCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IFwiIDogXCI7XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IGhhbmRsZUV4cHJlc3Npb24obm9kZS5hbHRlcm5hdGUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJVbmhhbmRsZWQ6IFwiICwgbm9kZS50eXBlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhhbmRsZUJpbmFyeUFyZ3VtZW50KG5vZGUpe1xuICAgICAgICB2YXIgcmVzdWx0ID0gaGFuZGxlRXhwcmVzc2lvbihub2RlKTtcbiAgICAgICAgc3dpdGNoKG5vZGUudHlwZSkge1xuICAgICAgICAgICAgY2FzZSBTeW50YXguQmluYXJ5RXhwcmVzc2lvbjpcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkxvZ2ljYWxFeHByZXNzaW9uOlxuICAgICAgICAgICAgY2FzZSBTeW50YXguQXNzaWdubWVudEV4cHJlc3Npb246IHJlc3VsdCA9IFwiKCBcIiArIHJlc3VsdCArIFwiIClcIjsgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBoYW5kbGVBcmd1bWVudHMoY29udGFpbmVyKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBcIihcIjtcbiAgICAgICAgY29udGFpbmVyLmZvckVhY2goZnVuY3Rpb24gKGFyZywgaW5kZXgpIHtcbiAgICAgICAgICAgIHJlc3VsdCArPSBoYW5kbGVFeHByZXNzaW9uKGFyZyk7XG4gICAgICAgICAgICBpZiAoaW5kZXggPCBjb250YWluZXIubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBcIiwgXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcmVzdWx0ICsgXCIpXCI7XG4gICAgfVxuXG5cbiAgICBleHBvcnRzLmdlbmVyYXRlID0gZ2VuZXJhdGU7XG5cblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIik7XG4gICAgdmFyIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XG5cbiAgICB2YXIgQ29sb3JDbG9zdXJlSW5zdGFuY2UgPSB7XG5cbiAgICB9O1xuXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIkNvbG9yQ2xvc3VyZVwiLFxuICAgICAgICBraW5kOiBTaGFkZS5PQkpFQ1RfS0lORFMuQ09MT1JfQ0xPU1VSRSxcbiAgICAgICAgb2JqZWN0OiB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogbnVsbCxcbiAgICAgICAgICAgIHN0YXRpYzoge31cbiAgICAgICAgfSxcbiAgICAgICAgaW5zdGFuY2U6IENvbG9yQ2xvc3VyZUluc3RhbmNlXG4gICAgfSk7XG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucykge1xuXG4gICAgdmFyIG9iamVjdHMgPSB7XG4gICAgICAgIC8vQ29sb3IgOiByZXF1aXJlKFwiLi9jb2xvci5qc1wiKSxcbiAgICAgICAgU2hhZGUgOiByZXF1aXJlKFwiLi9zaGFkZS5qc1wiKSxcbiAgICAgICAgLy9NYXRyaXg0IDogcmVxdWlyZShcIi4vbWF0cml4LmpzXCIpLFxuICAgICAgICBNYXRoIDogcmVxdWlyZShcIi4vbWF0aC5qc1wiKSxcbiAgICAgICAgU3lzdGVtIDogcmVxdWlyZShcIi4vc3lzdGVtLmpzXCIpLFxuICAgICAgICBWZWMyIDogcmVxdWlyZShcIi4vdmVjMi5qc1wiKSxcbiAgICAgICAgVmVjMyA6IHJlcXVpcmUoXCIuL3ZlYzMuanNcIiksXG4gICAgICAgIENvbG9yOiByZXF1aXJlKFwiLi92ZWMzLmpzXCIpLFxuICAgICAgICBWZWM0IDogcmVxdWlyZShcIi4vdmVjNC5qc1wiKSxcbiAgICAgICAgQ29sb3JDbG9zdXJlOiByZXF1aXJlKFwiLi9jb2xvcmNsb3N1cmUuanNcIilcbiAgICB9O1xuXG4gICAgbnMuUmVnaXN0cnkgPSB7XG4gICAgICAgIG5hbWU6IFwiR0xTTFRyYW5zZm9ybVJlZ2lzdHJ5XCIsXG4gICAgICAgIGdldEJ5TmFtZTogZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG9iamVjdHNbbmFtZV07XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8IG51bGw7XG4gICAgICAgIH0sXG4gICAgICAgIGdldEluc3RhbmNlRm9yS2luZDogZnVuY3Rpb24oa2luZCkge1xuICAgICAgICAgICAgZm9yKHZhciBvYmogaW4gb2JqZWN0cykge1xuICAgICAgICAgICAgICAgIGlmIChvYmplY3RzW29ial0ua2luZCA9PSBraW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvYmplY3RzW29ial0uaW5zdGFuY2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKTtcbiAgIHZhciBTeW50YXggPSByZXF1aXJlKCdlc3RyYXZlcnNlJykuU3ludGF4O1xuICAgdmFyIFRvb2xzID0gcmVxdWlyZSgnLi90b29scy5qcycpO1xuXG4gICAgdmFyIE1hdGhDb25zdGFudHMgPSBbXCJFXCIsIFwiUElcIiwgXCJMTjJcIiwgXCJMT0cyRVwiLCBcIkxPRzEwRVwiLCBcIlBJXCIsIFwiU1FSVDFfMlwiLCBcIlNRUlQyXCJdO1xuXG5cblxuICAgIHZhciBoYW5kbGVJbnRWZXJzaW9uID0gZnVuY3Rpb24obm9kZSwgcGFyZW50KSB7XG4gICAgICAgIHBhcmVudC5leHRyYS50eXBlID0gU2hhZGUuVFlQRVMuTlVNQkVSO1xuICAgICAgICByZXR1cm4gVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24obm9kZSk7XG4gICAgfVxuXG5cbiAgICB2YXIgTWF0aEVudHJ5ICA9IHtcbiAgICAgICAgYWJzOiB7IHByb3BlcnR5OiBUb29scy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiB9LFxuICAgICAgICBhY29zOiB7IHByb3BlcnR5OiBUb29scy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiB9LFxuICAgICAgICBhc2luOiB7IHByb3BlcnR5OiBUb29scy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiB9LFxuICAgICAgICBhdGFuOiB7IHByb3BlcnR5OiBUb29scy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiB9LFxuICAgICAgICBhdGFuMjogeyBwcm9wZXJ0eTogZnVuY3Rpb24oKSB7IHJldHVybiB7IHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLCBuYW1lOiBcImF0YW5cIiB9IH19LFxuICAgICAgICBjZWlsOiB7IHByb3BlcnR5OiBoYW5kbGVJbnRWZXJzaW9uIH0sXG4gICAgICAgIGNvczogIHsgcHJvcGVydHk6IFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uIH0sXG4gICAgICAgIGV4cDogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcbiAgICAgICAgZmxvb3I6IHsgcHJvcGVydHk6IGhhbmRsZUludFZlcnNpb24gfSxcbiAgICAgICAgLy8gaW11bDogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcbiAgICAgICAgbG9nOiB7IHByb3BlcnR5OiBUb29scy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiB9LFxuICAgICAgICBtYXg6IHsgcHJvcGVydHk6IFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uIH0sXG4gICAgICAgIG1pbjogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcbiAgICAgICAgcG93OiB7IHByb3BlcnR5OiBUb29scy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiB9LFxuICAgICAgICAvLyByYW5kb206IGZ1bmN0aW9uIHJhbmRvbSgpIHsgW25hdGl2ZSBjb2RlXSB9XG4gICAgICAgIHJvdW5kOiB7IHByb3BlcnR5OiBUb29scy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiB9LCAvLyBTaW5jZSBHTFNMIDEuMywgd2hhdCBkb2VzIFdlYkdMIHVzZT9cbiAgICAgICAgc2luOiAgeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcbiAgICAgICAgc3FydDogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcbiAgICAgICAgdGFuOiB7IHByb3BlcnR5OiBUb29scy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiB9XG4gICAgfTtcblxuICAgIE1hdGhDb25zdGFudHMuZm9yRWFjaChmdW5jdGlvbiAoY29uc3RhbnQpIHtcbiAgICAgICAgTWF0aEVudHJ5W2NvbnN0YW50XSA9IHtcbiAgICAgICAgICAgIHByb3BlcnR5OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICB7IHR5cGU6IFN5bnRheC5MaXRlcmFsLCB2YWx1ZTogTWF0aFtjb25zdGFudF0sIGV4dHJhOiB7IHR5cGU6IFNoYWRlLlRZUEVTLk5VTUJFUiB9IH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIFRvb2xzLmV4dGVuZChucywge1xuICAgICAgICBpZDogXCJNYXRoXCIsXG4gICAgICAgIG9iamVjdDoge1xuICAgICAgICAgICAgY29uc3RydWN0b3I6IG51bGwsXG4gICAgICAgICAgICBzdGF0aWM6IE1hdGhFbnRyeVxuICAgICAgICB9LFxuICAgICAgICBpbnN0YW5jZTogTWF0aEVudHJ5XG4gICAgfSk7XG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uKG5zKXtcblxuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpO1xuICAgIHZhciBTeW50YXggPSByZXF1aXJlKCdlc3RyYXZlcnNlJykuU3ludGF4O1xuICAgIHZhciBUb29scyA9IHJlcXVpcmUoJy4vdG9vbHMuanMnKTtcblxuICAgIHZhciBTaGFkZU9iamVjdCA9IHtcbiAgICAgICAgZGlmZnVzZToge30sXG4gICAgICAgIHBob25nOiB7fSxcbiAgICAgICAgZnJhY3Q6IHsgcHJvcGVydHk6IFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uIH0sXG4gICAgICAgIGNsYW1wOiB7IHByb3BlcnR5OiBUb29scy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiB9LFxuICAgICAgICBzdGVwOiB7IHByb3BlcnR5OiBUb29scy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiB9LFxuICAgICAgICBzbW9vdGhzdGVwOiB7IHByb3BlcnR5OiBUb29scy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiB9XG4gICAgfVxuXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XG4gICAgaWQ6IFwiU2hhZGVcIixcbiAgICBvYmplY3Q6IHtcbiAgICAgICAgY29uc3RydWN0b3I6IG51bGwsXG4gICAgICAgIHN0YXRpYzogU2hhZGVPYmplY3RcbiAgICB9LFxuICAgIGluc3RhbmNlOiBudWxsXG59KTtcblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24gKG5zKSB7XG5cbiAgICB2YXIgQmFzZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9iYXNlL2luZGV4LmpzXCIpLFxuICAgICAgICBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpO1xuXG4gICAgdmFyIFN5c3RlbVBhcmFtZXRlck5hbWVzID0ge1xuICAgICAgICBcIm5vcm1hbGl6ZWRDb29yZHNcIiA6IFwiX3N5c19ub3JtYWxpemVkQ29vcmRzXCIsXG4gICAgICAgIFwiaGVpZ2h0XCI6IFwiX3N5c19oZWlnaHRcIixcbiAgICAgICAgXCJ3aWR0aFwiOiBcIl9zeXNfd2lkdGhcIlxuICAgIH1cblxuICAgIHZhciBTeXN0ZW1FbnRyeSA9IHtcbiAgICAgICAgY29vcmRzOiB7XG4gICAgICAgICAgICBwcm9wZXJ0eTogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgICAgICBub2RlLnByb3BlcnR5Lm5hbWUgPSBcImdsX0ZyYWdDb29yZFwiO1xuICAgICAgICAgICAgICAgIHJldHVybiBub2RlLnByb3BlcnR5O1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBub3JtYWxpemVkQ29vcmRzOiB7XG4gICAgICAgICAgICBwcm9wZXJ0eTogZnVuY3Rpb24gKG5vZGUsIHBhcmVudCwgY29udGV4dCwgc3RhdGUpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5nbG9iYWxQYXJhbWV0ZXJzW1N5c3RlbVBhcmFtZXRlck5hbWVzLm5vcm1hbGl6ZWRDb29yZHNdID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTaGFkZS5UWVBFUy5PQkpFQ1QsXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IFNoYWRlLk9CSkVDVF9LSU5EUy5GTE9BVDMsXG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZTogU2hhZGUuU09VUkNFUy5VTklGT1JNXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG5vZGUucHJvcGVydHkubmFtZSA9IFN5c3RlbVBhcmFtZXRlck5hbWVzLm5vcm1hbGl6ZWRDb29yZHM7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGUucHJvcGVydHk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGhlaWdodDoge1xuICAgICAgICAgICAgcHJvcGVydHk6IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQsIGNvbnRleHQsIHN0YXRlKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUuZ2xvYmFsUGFyYW1ldGVyc1tTeXN0ZW1QYXJhbWV0ZXJOYW1lcy5oZWlnaHRdID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTaGFkZS5UWVBFUy5OVU1CRVIsXG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZTogU2hhZGUuU09VUkNFUy5VTklGT1JNXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG5vZGUucHJvcGVydHkubmFtZSA9IFN5c3RlbVBhcmFtZXRlck5hbWVzLmhlaWdodDtcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZS5wcm9wZXJ0eTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgd2lkdGg6IHtcbiAgICAgICAgICAgIHByb3BlcnR5OiBmdW5jdGlvbiAobm9kZSwgcGFyZW50LCBjb250ZXh0LCBzdGF0ZSkge1xuICAgICAgICAgICAgICAgIHN0YXRlLmdsb2JhbFBhcmFtZXRlcnNbU3lzdGVtUGFyYW1ldGVyTmFtZXMud2lkdGhdID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTaGFkZS5UWVBFUy5OVU1CRVIsXG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZTogU2hhZGUuU09VUkNFUy5VTklGT1JNXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG5vZGUucHJvcGVydHkubmFtZSA9IFN5c3RlbVBhcmFtZXRlck5hbWVzLndpZHRoO1xuICAgICAgICAgICAgICAgIHJldHVybiBub2RlLnByb3BlcnR5O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgQmFzZS5leHRlbmQobnMsIHtcbiAgICAgICAgaWQ6IFwiU3lzdGVtXCIsXG4gICAgICAgIG9iamVjdDoge1xuICAgICAgICAgICAgY29uc3RydWN0b3I6IG51bGwsXG4gICAgICAgICAgICBzdGF0aWM6IFN5c3RlbUVudHJ5XG4gICAgICAgIH0sXG4gICAgICAgIGluc3RhbmNlOiBudWxsXG4gICAgfSk7XG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbiAobnMpIHtcblxuICAgIHZhciBTeW50YXggPSByZXF1aXJlKCdlc3RyYXZlcnNlJykuU3ludGF4O1xuICAgIHZhciBCYXNlID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvaW5kZXguanNcIik7XG4gICAgdmFyIEFOTk8gPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkFOTk87XG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIiksXG4gICAgICAgIFRZUEVTID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxuICAgICAgICBWZWNCYXNlID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvdmVjLmpzXCIpO1xuXG5cbiAgICBucy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgIG5hbWU6IG5vZGUucHJvcGVydHkubmFtZVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIFZlYyA9IHtcbiAgICAgICAgZ2VuZXJhdGVWZWNGcm9tQXJnczogZnVuY3Rpb24odmVjQ291bnQsIGFyZ3Mpe1xuICAgICAgICAgICAgaWYodmVjQ291bnQgPT0gMSlcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJnc1swXTtcbiAgICAgICAgICAgIGlmKGFyZ3MubGVuZ3RoID09IDEgJiYgQU5OTyhhcmdzWzBdKS5pc09mS2luZChLSU5EU1snRkxPQVQnICsgdmVjQ291bnRdKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJnc1swXTtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk5ld0V4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgY2FsbGVlOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIlZlY1wiICsgdmVjQ291bnRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50czogYXJnc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIEFOTk8ocmVzdWx0KS5zZXRUeXBlKFRZUEVTLk9CSkVDVCwgS0lORFNbJ0ZMT0FUJyArIHZlY0NvdW50XSk7XG4gICAgICAgICAgICBBTk5PKHJlc3VsdC5jYWxsZWUpLnNldFR5cGUoVFlQRVMuRlVOQ1RJT04pO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSxcblxuICAgICAgICBjcmVhdGVTd2l6emxlOiBmdW5jdGlvbih2ZWNDb3VudCwgc3dpenpsZSwgbm9kZSwgYXJncywgcGFyZW50KXtcbiAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA9PSAwKVxuICAgICAgICAgICAgICAgIHJldHVybiBub2RlLmNhbGxlZTtcbiAgICAgICAgICAgIHZhciBzaW5ndWxhciA9IHN3aXp6bGUubGVuZ3RoID09IDE7XG4gICAgICAgICAgICB2YXIgYXJnT2JqZWN0ID0gc2luZ3VsYXIgPyBub2RlLmFyZ3VtZW50c1swXSA6IFZlYy5nZW5lcmF0ZVZlY0Zyb21BcmdzKHN3aXp6bGUubGVuZ3RoLCBub2RlLmFyZ3VtZW50cyk7XG4gICAgICAgICAgICB2YXIgcmVwbGFjZSA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTmV3RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBjYWxsZWU6IHtcbiAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgICAgICAgICBuYW1lOiBcIlZlY1wiICsgdmVjQ291bnRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50czogW11cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgaW5kaWNlcyA9IFtdO1xuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHN3aXp6bGUubGVuZ3RoOyArK2kpe1xuICAgICAgICAgICAgICAgIHZhciBpZHggPSBWZWNCYXNlLnN3aXp6bGVUb0luZGV4KHN3aXp6bGUuY2hhckF0KGkpKTtcbiAgICAgICAgICAgICAgICBpbmRpY2VzW2lkeF0gPSBpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHZlY0NvdW50OyArK2kpe1xuICAgICAgICAgICAgICAgIGlmKGluZGljZXNbaV0gIT09IHVuZGVmaW5lZCl7XG4gICAgICAgICAgICAgICAgICAgIHJlcGxhY2UuYXJndW1lbnRzW2ldID0gc2luZ3VsYXIgPyBhcmdPYmplY3QgOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdDogYXJnT2JqZWN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBWZWNCYXNlLmluZGV4VG9Td2l6emxlKGluZGljZXNbaV0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgICAgcmVwbGFjZS5hcmd1bWVudHNbaV0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdDogbm9kZS5jYWxsZWUub2JqZWN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBWZWNCYXNlLmluZGV4VG9Td2l6emxlKGkpXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgQU5OTyhyZXBsYWNlKS5jb3B5KEFOTk8obm9kZSkpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcGxhY2U7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYXR0YWNoU3dpenpsZXM6IGZ1bmN0aW9uIChpbnN0YW5jZSwgdmVjQ291bnQpe1xuICAgICAgICAgICAgZm9yKHZhciBzID0gMDsgcyA8IFZlY0Jhc2Uuc3dpenpsZVNldHMubGVuZ3RoOyArK3Mpe1xuICAgICAgICAgICAgICAgIGZvcih2YXIgY291bnQgPSAxOyBjb3VudCA8PSA0OyArK2NvdW50KXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1heCA9IE1hdGgucG93KHZlY0NvdW50LCBjb3VudCk7XG4gICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgbWF4OyArK2kpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZhbCA9IGk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIga2V5ID0gXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcih2YXIgIGogPSAwOyBqIDwgY291bnQ7ICsrail7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkeCA9IHZhbCAlIHZlY0NvdW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IE1hdGguZmxvb3IodmFsIC8gdmVjQ291bnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleSs9IFZlY0Jhc2Uuc3dpenpsZVNldHNbc11baWR4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbmNlW2tleV0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbEV4cDogVmVjLmNyZWF0ZVN3aXp6bGUuYmluZChudWxsLCB2ZWNDb3VudCwga2V5KVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBjcmVhdGVPcGVyYXRvcjogZnVuY3Rpb24odmVjQ291bnQsIG9wZXJhdG9yLCBub2RlLCBhcmdzLCBwYXJlbnQpIHtcbiAgICAgICAgICAgIHZhciBvdGhlciA9IFZlYy5nZW5lcmF0ZVZlY0Zyb21BcmdzKHZlY0NvdW50LCBub2RlLmFyZ3VtZW50cyk7XG4gICAgICAgICAgICB2YXIgcmVwbGFjZSA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogb3BlcmF0b3IsXG4gICAgICAgICAgICAgICAgbGVmdDogbm9kZS5jYWxsZWUub2JqZWN0LFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBvdGhlclxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIEFOTk8ocmVwbGFjZSkuY29weShBTk5PKG5vZGUpKTtcbiAgICAgICAgICAgIHJldHVybiByZXBsYWNlO1xuICAgICAgICB9LFxuXG4gICAgICAgIGF0dGFjaE9wZXJhdG9yczogZnVuY3Rpb24oaW5zdGFuY2UsIHZlY0NvdW50LCBvcGVyYXRvcnMpe1xuICAgICAgICAgICAgZm9yKHZhciBuYW1lIGluIG9wZXJhdG9ycyl7XG4gICAgICAgICAgICAgICAgdmFyIG9wZXJhdG9yID0gb3BlcmF0b3JzW25hbWVdO1xuICAgICAgICAgICAgICAgIGluc3RhbmNlW25hbWVdID0ge1xuICAgICAgICAgICAgICAgICAgICBjYWxsRXhwOiBWZWMuY3JlYXRlT3BlcmF0b3IuYmluZChudWxsLCB2ZWNDb3VudCwgb3BlcmF0b3IpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGNyZWF0ZUZ1bmN0aW9uQ2FsbDogZnVuY3Rpb24oZnVuY3Rpb25OYW1lLCBzZWNvbmRWZWNTaXplLCBub2RlLCBhcmdzLCBwYXJlbnQpIHtcbiAgICAgICAgICAgIHZhciByZXBsYWNlID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5DYWxsRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBjYWxsZWU6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGZ1bmN0aW9uTmFtZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgYXJndW1lbnRzOiBbXG4gICAgICAgICAgICAgICAgICAgIG5vZGUuY2FsbGVlLm9iamVjdFxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZihzZWNvbmRWZWNTaXplKXtcbiAgICAgICAgICAgICAgICB2YXIgb3RoZXIgPSBWZWMuZ2VuZXJhdGVWZWNGcm9tQXJncyhzZWNvbmRWZWNTaXplLCBub2RlLmFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgcmVwbGFjZS5hcmd1bWVudHMucHVzaChvdGhlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBBTk5PKHJlcGxhY2UpLmNvcHkoQU5OTyhub2RlKSk7XG4gICAgICAgICAgICByZXR1cm4gcmVwbGFjZTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZW5lcmF0ZUxlbmd0aENhbGw6IGZ1bmN0aW9uKG5vZGUsIGFyZ3MsIHBhcmVudCl7XG4gICAgICAgICAgICAgICAgaWYoYXJncy5sZW5ndGggPT0gMCl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBWZWMuY3JlYXRlRnVuY3Rpb25DYWxsKCdsZW5ndGgnLCAwLCBub2RlLCBhcmdzLCBwYXJlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgICAgdmFyIHJlcGxhY2UgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wZXJhdG9yOiAnKicsXG4gICAgICAgICAgICAgICAgICAgICAgICBsZWZ0OiBub2RlLmNhbGxlZS5vYmplY3QsXG4gICAgICAgICAgICAgICAgICAgICAgICByaWdodDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZXJhdG9yOiAnLycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGVmdDogbm9kZS5hcmd1bWVudHNbMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IFZlYy5jcmVhdGVGdW5jdGlvbkNhbGwoJ2xlbmd0aCcsIDAsIG5vZGUsIGFyZ3MsIHBhcmVudClcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgQU5OTyhyZXBsYWNlLnJpZ2h0KS5zZXRUeXBlKFRZUEVTLk5VTUJFUik7XG4gICAgICAgICAgICAgICAgICAgIEFOTk8ocmVwbGFjZSkuY29weShBTk5PKG5vZGUpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlcGxhY2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgIH07XG4gICAgbnMuVmVjID0gVmVjO1xuXG4gICAgbnMuZXh0ZW5kID0gQmFzZS5leHRlbmQ7XG5cblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIik7XG4gICAgdmFyIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXg7XG4gICAgdmFyIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XG4gICAgdmFyIEFOTk8gPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkFOTk87XG5cbiAgICB2YXIgVFlQRVMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFM7XG5cbiAgICB2YXIgVmVjMkluc3RhbmNlID0ge1xuICAgICAgICBub3JtYWxpemU6IHtcbiAgICAgICAgICAgIGNhbGxFeHA6IFRvb2xzLlZlYy5jcmVhdGVGdW5jdGlvbkNhbGwuYmluZChudWxsLCAnbm9ybWFsaXplJywgMClcbiAgICAgICAgfSxcbiAgICAgICAgZG90OiB7XG4gICAgICAgICAgICBjYWxsRXhwOiBUb29scy5WZWMuY3JlYXRlRnVuY3Rpb25DYWxsLmJpbmQobnVsbCwgJ2RvdCcsIDIpXG4gICAgICAgIH0sXG4gICAgICAgIGxlbmd0aDoge1xuICAgICAgICAgICAgY2FsbEV4cDogVG9vbHMuVmVjLmdlbmVyYXRlTGVuZ3RoQ2FsbFxuICAgICAgICB9XG4gICAgfVxuICAgIFRvb2xzLlZlYy5hdHRhY2hTd2l6emxlcyhWZWMySW5zdGFuY2UsIDIpO1xuICAgIFRvb2xzLlZlYy5hdHRhY2hPcGVyYXRvcnMoVmVjMkluc3RhbmNlLCAyLCB7XG4gICAgICAgIGFkZDogJysnLFxuICAgICAgICBzdWI6ICctJyxcbiAgICAgICAgbXVsOiAnKicsXG4gICAgICAgIGRpdjogJy8nLFxuICAgICAgICBtb2Q6ICclJ1xuICAgIH0pXG5cblxuICAgIFRvb2xzLmV4dGVuZChucywge1xuICAgICAgICBpZDogXCJWZWMyXCIsXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUMixcbiAgICAgICAgb2JqZWN0OiB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogbnVsbCxcbiAgICAgICAgICAgIHN0YXRpYzoge31cbiAgICAgICAgfSxcbiAgICAgICAgaW5zdGFuY2U6IFZlYzJJbnN0YW5jZVxuICAgIH0pO1xuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucyl7XG5cbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKTtcbiAgICB2YXIgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheDtcbiAgICB2YXIgVG9vbHMgPSByZXF1aXJlKFwiLi90b29scy5qc1wiKTtcbiAgICB2YXIgQU5OTyA9IHJlcXVpcmUoXCIuLi8uLi8uLi9iYXNlL2Fubm90YXRpb24uanNcIikuQU5OTztcblxuICAgIHZhciBUWVBFUyA9IFNoYWRlLlRZUEVTLFxuICAgICAgICBLSU5EUyA9IFNoYWRlLk9CSkVDVF9LSU5EUztcblxuICAgIHZhciBWZWMzSW5zdGFuY2UgPSB7XG4gICAgICAgIG5vcm1hbGl6ZToge1xuICAgICAgICAgICAgY2FsbEV4cDogVG9vbHMuVmVjLmNyZWF0ZUZ1bmN0aW9uQ2FsbC5iaW5kKG51bGwsICdub3JtYWxpemUnLCAwKVxuICAgICAgICB9LFxuICAgICAgICBkb3Q6IHtcbiAgICAgICAgICAgIGNhbGxFeHA6IFRvb2xzLlZlYy5jcmVhdGVGdW5jdGlvbkNhbGwuYmluZChudWxsLCAnZG90JywgMylcbiAgICAgICAgfSxcbiAgICAgICAgbGVuZ3RoOiB7XG4gICAgICAgICAgICBjYWxsRXhwOiBUb29scy5WZWMuZ2VuZXJhdGVMZW5ndGhDYWxsXG4gICAgICAgIH1cbiAgICB9XG4gICAgVG9vbHMuVmVjLmF0dGFjaFN3aXp6bGVzKFZlYzNJbnN0YW5jZSwgMyk7XG4gICAgVG9vbHMuVmVjLmF0dGFjaE9wZXJhdG9ycyhWZWMzSW5zdGFuY2UsIDMsIHtcbiAgICAgICAgYWRkOiAnKycsXG4gICAgICAgIHN1YjogJy0nLFxuICAgICAgICBtdWw6ICcqJyxcbiAgICAgICAgZGl2OiAnLycsXG4gICAgICAgIG1vZDogJyUnXG4gICAgfSlcblxuXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIlZlYzNcIixcbiAgICAgICAga2luZDogS0lORFMuRkxPQVQzLFxuICAgICAgICBvYmplY3Q6IHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBudWxsLFxuICAgICAgICAgICAgc3RhdGljOiB7fVxuICAgICAgICB9LFxuICAgICAgICBpbnN0YW5jZTogVmVjM0luc3RhbmNlXG4gICAgfSk7XG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uKG5zKXtcblxuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpO1xuICAgIHZhciBTeW50YXggPSByZXF1aXJlKCdlc3RyYXZlcnNlJykuU3ludGF4O1xuICAgIHZhciBUb29scyA9IHJlcXVpcmUoXCIuL3Rvb2xzLmpzXCIpO1xuICAgIHZhciBBTk5PID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvYW5ub3RhdGlvbi5qc1wiKS5BTk5PO1xuXG4gICAgdmFyIFRZUEVTID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTO1xuXG4gICAgdmFyIFZlYzRJbnN0YW5jZSA9IHtcbiAgICAgICAgbm9ybWFsaXplOiB7XG4gICAgICAgICAgICBjYWxsRXhwOiBUb29scy5WZWMuY3JlYXRlRnVuY3Rpb25DYWxsLmJpbmQobnVsbCwgJ25vcm1hbGl6ZScsIDApXG4gICAgICAgIH0sXG4gICAgICAgIGRvdDoge1xuICAgICAgICAgICAgY2FsbEV4cDogVG9vbHMuVmVjLmNyZWF0ZUZ1bmN0aW9uQ2FsbC5iaW5kKG51bGwsICdkb3QnLCA0KVxuICAgICAgICB9LFxuICAgICAgICBsZW5ndGg6IHtcbiAgICAgICAgICAgIGNhbGxFeHA6IFRvb2xzLlZlYy5nZW5lcmF0ZUxlbmd0aENhbGxcbiAgICAgICAgfVxuICAgIH1cbiAgICBUb29scy5WZWMuYXR0YWNoU3dpenpsZXMoVmVjNEluc3RhbmNlLCA0KTtcbiAgICBUb29scy5WZWMuYXR0YWNoT3BlcmF0b3JzKFZlYzRJbnN0YW5jZSwgNCwge1xuICAgICAgICBhZGQ6ICcrJyxcbiAgICAgICAgc3ViOiAnLScsXG4gICAgICAgIG11bDogJyonLFxuICAgICAgICBkaXY6ICcvJyxcbiAgICAgICAgbW9kOiAnJSdcbiAgICB9KVxuXG5cbiAgICBUb29scy5leHRlbmQobnMsIHtcbiAgICAgICAgaWQ6IFwiVmVjNFwiLFxuICAgICAgICBraW5kOiBLSU5EUy5GTE9BVDQsXG4gICAgICAgIG9iamVjdDoge1xuICAgICAgICAgICAgY29uc3RydWN0b3I6IG51bGwsXG4gICAgICAgICAgICBzdGF0aWM6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIGluc3RhbmNlOiBWZWM0SW5zdGFuY2VcbiAgICB9KTtcblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24gKG5zKSB7XG5cbiAgICB2YXIgQmFzZSA9IHJlcXVpcmUoXCIuLi8uLi9iYXNlL2luZGV4LmpzXCIpLFxuICAgICAgICBBbm5vdGF0aW9uID0gcmVxdWlyZShcIi4uLy4uL2Jhc2UvYW5ub3RhdGlvbi5qc1wiKS5Bbm5vdGF0aW9uLFxuICAgICAgICBGdW5jdGlvbkFubm90YXRpb24gPSByZXF1aXJlKFwiLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkZ1bmN0aW9uQW5ub3RhdGlvbixcbiAgICAgICAgVHlwZUluZm8gPSByZXF1aXJlKFwiLi4vLi4vYmFzZS90eXBlaW5mby5qc1wiKS5UeXBlSW5mbyxcbiAgICAgICAgU2hhZGUgPSByZXF1aXJlKFwiLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpLFxuICAgICAgICBUeXBlcyA9IFNoYWRlLlRZUEVTLFxuICAgICAgICBLaW5kcyA9IFNoYWRlLk9CSkVDVF9LSU5EUyxcbiAgICAgICAgU291cmNlcyA9IHJlcXVpcmUoXCIuLy4uLy4uL2ludGVyZmFjZXMuanNcIikuU09VUkNFUztcblxuICAgIHZhciBPYmplY3RSZWdpc3RyeSA9IHJlcXVpcmUoXCIuL3JlZ2lzdHJ5L2luZGV4LmpzXCIpLlJlZ2lzdHJ5LFxuICAgICAgICBDb250ZXh0ID0gcmVxdWlyZShcIi4uLy4uL2Jhc2UvY29udGV4dC5qc1wiKS5nZXRDb250ZXh0KE9iamVjdFJlZ2lzdHJ5KTtcblxuXG4gICAgdmFyIHdhbGsgPSByZXF1aXJlKCdlc3RyYXZlcnNlJyk7XG4gICAgdmFyIFN5bnRheCA9IHdhbGsuU3ludGF4O1xuXG5cbiAgICAvKipcbiAgICAgKiBUcmFuc2Zvcm1zIHRoZSBKUyBBU1QgdG8gYW4gQVNUIHJlcHJlc2VudGF0aW9uIGNvbnZlbmllbnRcbiAgICAgKiBmb3IgY29kZSBnZW5lcmF0aW9uXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgdmFyIEdMQVNUVHJhbnNmb3JtZXIgPSBmdW5jdGlvbiAobWFpbklkKSB7XG4gICAgICAgIHRoaXMubWFpbklkID0gbWFpbklkO1xuICAgIH07XG5cbiAgICBCYXNlLmV4dGVuZChHTEFTVFRyYW5zZm9ybWVyLnByb3RvdHlwZSwge1xuICAgICAgICByZWdpc3Rlckdsb2JhbENvbnRleHQgOiBmdW5jdGlvbiAocHJvZ3JhbSkge1xuICAgICAgICAgICAgdmFyIGN0eCA9IG5ldyBDb250ZXh0KHByb2dyYW0sIG51bGwsIHtuYW1lOiBcImdsb2JhbFwifSk7XG4gICAgICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJNYXRoXCIsIE9iamVjdFJlZ2lzdHJ5LmdldEJ5TmFtZShcIk1hdGhcIikpO1xuICAgICAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwidGhpc1wiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJTeXN0ZW1cIikpO1xuICAgICAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwiU2hhZGVcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiU2hhZGVcIikpO1xuICAgICAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwiVmVjMlwiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJWZWMyXCIpKTtcbiAgICAgICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIlZlYzNcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiVmVjM1wiKSk7XG4gICAgICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJDb2xvclwiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJWZWMzXCIpKTtcbiAgICAgICAgICAgIGN0eC5kZWNsYXJlVmFyaWFibGUoXCJnbF9GcmFnQ29vcmRcIiwgZmFsc2UpO1xuICAgICAgICAgICAgY3R4LnVwZGF0ZUV4cHJlc3Npb24oXCJnbF9GcmFnQ29vcmRcIiwgbmV3IFR5cGVJbmZvKHtcbiAgICAgICAgICAgICAgICBleHRyYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUeXBlcy5PQkpFQ1QsXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IEtpbmRzLkZMT0FUM1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIGN0eC5kZWNsYXJlVmFyaWFibGUoXCJfX3N5c19ub3JtYWxpemVkQ29vcmRzXCIsIGZhbHNlKTtcbiAgICAgICAgICAgIGN0eC51cGRhdGVFeHByZXNzaW9uKFwiX19zeXNfbm9ybWFsaXplZENvb3Jkc1wiLCBuZXcgVHlwZUluZm8oe1xuICAgICAgICAgICAgICAgIGV4dHJhOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFR5cGVzLk9CSkVDVCxcbiAgICAgICAgICAgICAgICAgICAga2luZDogS2luZHMuRkxPQVQzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgICByZXR1cm4gY3R4O1xuICAgICAgICB9LFxuICAgICAgICB0cmFuc2Zvcm1BQVNUOiBmdW5jdGlvbiAocHJvZ3JhbSkge1xuICAgICAgICAgICAgdGhpcy5yb290ID0gcHJvZ3JhbTtcbiAgICAgICAgICAgIHZhciBjb250ZXh0ID0gdGhpcy5yZWdpc3Rlckdsb2JhbENvbnRleHQocHJvZ3JhbSk7XG5cbiAgICAgICAgICAgIHZhciBzdGF0ZSA9IHtcbiAgICAgICAgICAgICAgICAgY29udGV4dDogY29udGV4dCxcbiAgICAgICAgICAgICAgICAgY29udGV4dFN0YWNrOiBbY29udGV4dF0sXG4gICAgICAgICAgICAgICAgIGluTWFpbjogIHRoaXMubWFpbklkID09IGNvbnRleHQuc3RyKCksXG4gICAgICAgICAgICAgICAgIGdsb2JhbFBhcmFtZXRlcnMgOiBwcm9ncmFtLmluamVjdGlvbnNbdGhpcy5tYWluSWRdICYmIHByb2dyYW0uaW5qZWN0aW9uc1t0aGlzLm1haW5JZF1bMF0gPyBwcm9ncmFtLmluamVjdGlvbnNbdGhpcy5tYWluSWRdWzBdLm5vZGUuaW5mbyA6IHt9LFxuICAgICAgICAgICAgICAgICBibG9ja2VkTmFtZXMgOiBbXSxcbiAgICAgICAgICAgICAgICAgdG9wRGVjbGFyYXRpb25zIDogW10sXG4gICAgICAgICAgICAgICAgIGlkTmFtZU1hcCA6IHt9XG4gICAgICAgICAgICB9XG5cblxuXG4gICAgICAgICAgICBmb3IodmFyIG5hbWUgaW4gc3RhdGUuZ2xvYmFsUGFyYW1ldGVycyl7XG4gICAgICAgICAgICAgICAgc3RhdGUuYmxvY2tlZE5hbWVzLnB1c2gobmFtZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMucmVwbGFjZShwcm9ncmFtLCBzdGF0ZSk7XG5cbiAgICAgICAgICAgIGZvcih2YXIgbmFtZSBpbiBzdGF0ZS5nbG9iYWxQYXJhbWV0ZXJzKXtcbiAgICAgICAgICAgICAgICBpZihuYW1lICE9PSBcIl9nbG9iYWxcIilcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRlY2wgPSBoYW5kbGVUb3BEZWNsYXJhdGlvbihuYW1lLCBzdGF0ZS5nbG9iYWxQYXJhbWV0ZXJzKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlY2wpXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmFtLmJvZHkudW5zaGlmdChkZWNsKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHByb2dyYW07XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdCF9IGFzdFxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdCF9IHN0YXRlXG4gICAgICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAgICAgKi9cbiAgICAgICAgcmVwbGFjZTogZnVuY3Rpb24oYXN0LCBzdGF0ZSkge1xuICAgICAgICAgICAgd2Fsay5yZXBsYWNlKGFzdCwge1xuXG4gICAgICAgICAgICAgICAgZW50ZXI6IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIkVudGVyOlwiLCBub2RlLnR5cGUpO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKG5vZGUudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguSWRlbnRpZmllcjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaGFuZGxlSWRlbnRpZmllcihub2RlLCBwYXJlbnQsIHN0YXRlLmJsb2NrZWROYW1lcywgc3RhdGUuaWROYW1lTWFwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LklmU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVJZlN0YXRlbWVudChub2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkNvbmRpdGlvbmFsRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaGFuZGxlQ29uZGl0aW9uYWxFeHByZXNzaW9uKG5vZGUsIHN0YXRlLCB0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkxvZ2ljYWxFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVMb2dpY2FsRXhwcmVzc2lvbihub2RlLCB0aGlzLCBzdGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5vIG5lZWQgdG8gZGVjbGFyZSwgdGhpcyBoYXMgYmVlbiBhbm5vdGF0ZWQgYWxyZWFkeVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwYXJlbnRDb250ZXh0ID0gc3RhdGUuY29udGV4dFN0YWNrW3N0YXRlLmNvbnRleHRTdGFjay5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29udGV4dCA9IG5ldyBDb250ZXh0KG5vZGUsIHBhcmVudENvbnRleHQsIHtuYW1lOiBub2RlLmlkLm5hbWUgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUuY29udGV4dFN0YWNrLnB1c2goY29udGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUuaW5NYWluID0gdGhpcy5tYWluSWQgPT0gY29udGV4dC5zdHIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSxcblxuICAgICAgICAgICAgICAgIGxlYXZlOiBmdW5jdGlvbihub2RlLCBwYXJlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoKG5vZGUudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguTWVtYmVyRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaGFuZGxlTWVtYmVyRXhwcmVzc2lvbihub2RlLCBwYXJlbnQsIHN0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkNhbGxFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVDYWxsRXhwcmVzc2lvbihub2RlLCBwYXJlbnQsIHN0YXRlLnRvcERlY2xhcmF0aW9ucywgc3RhdGUuY29udGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlLmNvbnRleHQgPSBzdGF0ZS5jb250ZXh0U3RhY2sucG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUuaW5NYWluID0gc3RhdGUuY29udGV4dC5zdHIoKSA9PSB0aGlzLm1haW5JZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdGUuaW5NYWluKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaGFuZGxlTWFpbkZ1bmN0aW9uKG5vZGUsIHBhcmVudCwgc3RhdGUuY29udGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5SZXR1cm5TdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoc3RhdGUuaW5NYWluKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVSZXR1cm5Jbk1haW4obm9kZSwgcGFyZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5CaW5hcnlFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVCaW5hcnlFeHByZXNzaW9uKG5vZGUsIHBhcmVudCk7XG5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gYXN0O1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgaGFuZGxlVG9wRGVjbGFyYXRpb24gPSBmdW5jdGlvbihuYW1lLCBnbG9iYWxQYXJhbWV0ZXJzKXtcbiAgICAgICAgdmFyIHByb3BlcnR5TGl0ZXJhbCA9ICB7IHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLCBuYW1lOiBnZXROYW1lRm9yR2xvYmFsKGdsb2JhbFBhcmFtZXRlcnMsIG5hbWUpfTtcbiAgICAgICAgdmFyIHByb3BlcnR5QW5ub3RhdGlvbiA9ICBuZXcgQW5ub3RhdGlvbihwcm9wZXJ0eUxpdGVyYWwpO1xuICAgICAgICBwcm9wZXJ0eUFubm90YXRpb24uc2V0RnJvbUV4dHJhKGdsb2JhbFBhcmFtZXRlcnNbbmFtZV0pO1xuXG4gICAgICAgIGlmIChwcm9wZXJ0eUFubm90YXRpb24uaXNOdWxsT3JVbmRlZmluZWQoKSlcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICB2YXIgZGVjbCA9IHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5WYXJpYWJsZURlY2xhcmF0aW9uLFxuICAgICAgICAgICAgZGVjbGFyYXRpb25zOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguVmFyaWFibGVEZWNsYXJhdG9yLFxuICAgICAgICAgICAgICAgICAgICBpZDogcHJvcGVydHlMaXRlcmFsLFxuICAgICAgICAgICAgICAgICAgICBpbml0OiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGtpbmQ6IFwidmFyXCJcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGRlY2xBbm5vdGF0aW9uID0gIG5ldyBBbm5vdGF0aW9uKGRlY2wuZGVjbGFyYXRpb25zWzBdKTtcbiAgICAgICAgZGVjbEFubm90YXRpb24uY29weShwcm9wZXJ0eUFubm90YXRpb24pO1xuICAgICAgICByZXR1cm4gZGVjbDtcbiAgICB9XG5cbiAgICB2YXIgaGFuZGxlSWRlbnRpZmllciA9IGZ1bmN0aW9uKG5vZGUsIHBhcmVudCwgYmxvY2tlZE5hbWVzLCBpZE5hbWVNYXApe1xuICAgICAgICBpZihwYXJlbnQudHlwZSA9PSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbilcbiAgICAgICAgICAgIHJldHVybiBub2RlO1xuICAgICAgICB2YXIgbmFtZSA9IG5vZGUubmFtZTtcbiAgICAgICAgaWYoaWROYW1lTWFwW25hbWVdKSBub2RlLm5hbWUgPSBpZE5hbWVNYXBbbmFtZV07XG4gICAgICAgIHZhciBuZXdOYW1lID0gbmFtZSwgaSA9IDE7XG4gICAgICAgIHdoaWxlKGJsb2NrZWROYW1lcy5pbmRleE9mKG5ld05hbWUpICE9IC0xKXtcbiAgICAgICAgICAgIG5ld05hbWUgPSBuYW1lICsgXCJfXCIgKyAoKytpKTtcbiAgICAgICAgfVxuICAgICAgICBpZE5hbWVNYXBbbmFtZV0gPSBuZXdOYW1lO1xuICAgICAgICBub2RlLm5hbWUgPSBuZXdOYW1lO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG5cblxuICAgIHZhciBoYW5kbGVSZXR1cm5Jbk1haW4gPSBmdW5jdGlvbihub2RlLCBwYXJlbnQpIHtcbiAgICAgICAgaWYgKG5vZGUuYXJndW1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJsb2NrU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgIGJvZHk6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkFzc2lnbm1lbnRFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgb3BlcmF0b3I6IFwiPVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGVmdDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiZ2xfRnJhZ0NvbG9yXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICByaWdodDogbm9kZS5hcmd1bWVudFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguUmV0dXJuU3RhdGVtZW50XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5FeHByZXNzaW9uU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgIGV4cHJlc3Npb24gOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBcImRpc2NhcmRcIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgaGFuZGxlTWFpbkZ1bmN0aW9uID0gZnVuY3Rpb24obm9kZSwgcGFyZW50LCBjb250ZXh0KSB7XG4gICAgICAgIHZhciBhbm5vID0gbmV3IEZ1bmN0aW9uQW5ub3RhdGlvbihub2RlKTtcbiAgICAgICAgYW5uby5zZXRSZXR1cm5JbmZvKHsgdHlwZTogVHlwZXMuVU5ERUZJTkVEIH0pO1xuXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGNvbnRleHQpO1xuICAgICAgICAvLyBNYWluIGhhcyBubyBwYXJhbWV0ZXJzXG4gICAgICAgIG5vZGUucGFyYW1zID0gW107XG4gICAgICAgIC8vIFJlbmFtZSB0byAnbWFpbidcbiAgICAgICAgbm9kZS5pZC5uYW1lID0gXCJtYWluXCI7XG4gICAgICAgIC8vY29uc29sZS5sb2cobm9kZSk7XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiBnZXRPYmplY3RSZWZlcmVuY2VGcm9tTm9kZShvYmplY3QsIGNvbnRleHQpIHtcbiAgICAgICAgc3dpdGNoIChvYmplY3QudHlwZSkge1xuICAgICAgICAgICAgY2FzZSBTeW50YXguTmV3RXhwcmVzc2lvbjpcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkNhbGxFeHByZXNzaW9uOlxuICAgICAgICAgICAgY2FzZSBTeW50YXguTWVtYmVyRXhwcmVzc2lvbjpcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkJpbmFyeUV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuY3JlYXRlVHlwZUluZm8ob2JqZWN0KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LklkZW50aWZpZXI6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuZ2V0QmluZGluZ0J5TmFtZShvYmplY3QubmFtZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5UaGlzRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICByZXR1cm4gY29udGV4dC5nZXRCaW5kaW5nQnlOYW1lKFwidGhpc1wiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5oYW5kbGVkIG9iamVjdCB0eXBlIGluIEdMU0wgZ2VuZXJhdGlvbjogXCIgKyBvYmplY3QudHlwZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgaGFuZGxlQ2FsbEV4cHJlc3Npb24gPSBmdW5jdGlvbiAoY2FsbEV4cHJlc3Npb24sIHBhcmVudCwgdG9wRGVjbGFyYXRpb25zLCBjb250ZXh0KSB7XG5cbiAgICAgICAgLy8gSXMgdGhpcyBhIGNhbGwgb24gYW4gb2JqZWN0P1xuICAgICAgICBpZiAoY2FsbEV4cHJlc3Npb24uY2FsbGVlLnR5cGUgPT0gU3ludGF4Lk1lbWJlckV4cHJlc3Npb24pIHtcbiAgICAgICAgICAgIHZhciBjYWxsZWVSZWZlcmVuY2UgPSBnZXRPYmplY3RSZWZlcmVuY2VGcm9tTm9kZShjYWxsRXhwcmVzc2lvbi5jYWxsZWUsIGNvbnRleHQpO1xuICAgICAgICAgICAgaWYoIShjYWxsZWVSZWZlcmVuY2UgJiYgY2FsbGVlUmVmZXJlbmNlLmlzRnVuY3Rpb24oKSkpXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU29tZXRoaW5nIHdlbnQgd3JvbmcgaW4gdHlwZSBpbmZlcmVuY2VcIik7XG5cbiAgICAgICAgICAgIHZhciBvYmplY3QgPSBjYWxsRXhwcmVzc2lvbi5jYWxsZWUub2JqZWN0LFxuICAgICAgICAgICAgICAgIHByb3BlcnR5TmFtZSA9IGNhbGxFeHByZXNzaW9uLmNhbGxlZS5wcm9wZXJ0eS5uYW1lO1xuXG4gICAgICAgICAgICB2YXIgb2JqZWN0UmVmZXJlbmNlID0gZ2V0T2JqZWN0UmVmZXJlbmNlRnJvbU5vZGUob2JqZWN0LCBjb250ZXh0KTtcbiAgICAgICAgICAgIGlmKCFvYmplY3RSZWZlcmVuY2UpICB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIk5vIG9iamVjdCBpbmZvIGZvcjogXCIsIG9iamVjdCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgb2JqZWN0SW5mbyA9IGNvbnRleHQuZ2V0T2JqZWN0SW5mb0ZvcihvYmplY3RSZWZlcmVuY2UpO1xuICAgICAgICAgICAgaWYoIW9iamVjdEluZm8pIHsgLy8gRXZlcnkgb2JqZWN0IG5lZWRzIGFuIGluZm8sIG90aGVyd2lzZSB3ZSBkaWQgc29tZXRoaW5nIHdyb25nXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIk5vIG9iamVjdCByZWdpc3RlcmVkIGZvcjogXCIsIG9iamVjdFJlZmVyZW5jZS5nZXRUeXBlU3RyaW5nKCksIEpTT04uc3RyaW5naWZ5KGNhbGxFeHByZXNzaW9uLmNhbGxlZSkpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAvL1NoYWRlLnRocm93RXJyb3IoY2FsbEV4cHJlc3Npb24sIFwiSW50ZXJuYWw6IE5vIHJlZ2lzdHJhdGlvbiBmb3Igb2JqZWN0OiBcIiArIG9iamVjdFJlZmVyZW5jZS5nZXRUeXBlU3RyaW5nKCkgKyBcIiwgXCIgKyBKU09OLnN0cmluZ2lmeShjYWxsRXhwcmVzc2lvbi5vYmplY3QpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvYmplY3RJbmZvLmhhc093blByb3BlcnR5KHByb3BlcnR5TmFtZSkpIHtcbiAgICAgICAgICAgICAgICB2YXIgcHJvcGVydHlIYW5kbGVyID0gb2JqZWN0SW5mb1twcm9wZXJ0eU5hbWVdO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcHJvcGVydHlIYW5kbGVyLmNhbGxFeHAgPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQW5ub3RhdGlvbi5jcmVhdGVBbm5vdGF0ZWROb2RlQXJyYXkoY2FsbEV4cHJlc3Npb24uYXJndW1lbnRzLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByb3BlcnR5SGFuZGxlci5jYWxsRXhwKGNhbGxFeHByZXNzaW9uLCBhcmdzLCBwYXJlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG5cbiAgICB9XG5cblxuICAgIHZhciBoYW5kbGVNZW1iZXJFeHByZXNzaW9uID0gZnVuY3Rpb24gKG1lbWJlckV4cHJlc3Npb24sIHBhcmVudCwgc3RhdGUpIHtcbiAgICAgICAgdmFyIHByb3BlcnR5TmFtZSA9IG1lbWJlckV4cHJlc3Npb24ucHJvcGVydHkubmFtZSxcbiAgICAgICAgICAgIGNvbnRleHQgPSBzdGF0ZS5jb250ZXh0O1xuXG4gICAgICAgIHZhciBvYmplY3RSZWZlcmVuY2UgPSBnZXRPYmplY3RSZWZlcmVuY2VGcm9tTm9kZShtZW1iZXJFeHByZXNzaW9uLm9iamVjdCwgY29udGV4dCk7XG5cbiAgICAgICAgaWYgKG9iamVjdFJlZmVyZW5jZSAmJiBvYmplY3RSZWZlcmVuY2UuaXNPYmplY3QoKSkge1xuICAgICAgICAgICAgdmFyIG9iamVjdEluZm8gPSBjb250ZXh0LmdldE9iamVjdEluZm9Gb3Iob2JqZWN0UmVmZXJlbmNlKTtcbiAgICAgICAgICAgIGlmKCFvYmplY3RJbmZvKSB7Ly8gRXZlcnkgb2JqZWN0IG5lZWRzIGFuIGluZm8sIG90aGVyd2lzZSB3ZSBkaWQgc29tZXRoaW5nIHdyb25nXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIk5vIG9iamVjdCByZWdpc3RlcmVkIGZvcjogXCIsIG9iamVjdFJlZmVyZW5jZS5nZXRUeXBlU3RyaW5nKCksIEpTT04uc3RyaW5naWZ5KG1lbWJlckV4cHJlc3Npb24ub2JqZWN0KSlcbiAgICAgICAgICAgICAgICAvL1NoYWRlLnRocm93RXJyb3IobWVtYmVyRXhwcmVzc2lvbiwgXCJJbnRlcm5hbDogTm8gcmVnaXN0cmF0aW9uIGZvciBvYmplY3Q6IFwiICsgb2JqZWN0UmVmZXJlbmNlLmdldFR5cGVTdHJpbmcoKSArIFwiLCBcIiArIEpTT04uc3RyaW5naWZ5KG1lbWJlckV4cHJlc3Npb24ub2JqZWN0KSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9iamVjdEluZm8uaGFzT3duUHJvcGVydHkocHJvcGVydHlOYW1lKSkge1xuICAgICAgICAgICAgICAgIHZhciBwcm9wZXJ0eUhhbmRsZXIgPSBvYmplY3RJbmZvW3Byb3BlcnR5TmFtZV07XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBwcm9wZXJ0eUhhbmRsZXIucHJvcGVydHkgPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9wZXJ0eUhhbmRsZXIucHJvcGVydHkobWVtYmVyRXhwcmVzc2lvbiwgcGFyZW50LCBjb250ZXh0LCBzdGF0ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGV4cCA9IG5ldyBBbm5vdGF0aW9uKG1lbWJlckV4cHJlc3Npb24pO1xuICAgICAgICBpZihvYmplY3RSZWZlcmVuY2UgJiYgb2JqZWN0UmVmZXJlbmNlLmlzR2xvYmFsKCkpIHtcbiAgICAgICAgICAgIHZhciBwcm9wZXJ0eUxpdGVyYWwgPSAgeyB0eXBlOiBTeW50YXguSWRlbnRpZmllciwgbmFtZTogZ2V0TmFtZUZvckdsb2JhbChvYmplY3RSZWZlcmVuY2UsIHByb3BlcnR5TmFtZSl9O1xuICAgICAgICAgICAgdmFyIHByb3BlcnR5QW5ub3RhdGlvbiA9ICBuZXcgQW5ub3RhdGlvbihwcm9wZXJ0eUxpdGVyYWwpO1xuICAgICAgICAgICAgcHJvcGVydHlBbm5vdGF0aW9uLmNvcHkoZXhwKTtcbiAgICAgICAgICAgIHByb3BlcnR5QW5ub3RhdGlvbi5zZXRHbG9iYWwodHJ1ZSk7XG5cbiAgICAgICAgICAgIHJldHVybiBwcm9wZXJ0eUxpdGVyYWw7XG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICB2YXIgZ2V0TmFtZUZvckdsb2JhbCA9IGZ1bmN0aW9uKHJlZmVyZW5jZSwgYmFzZU5hbWUpIHtcbiAgICAgICAgdmFyIGVudHJ5ID0gcmVmZXJlbmNlW2Jhc2VOYW1lXTtcbiAgICAgICAgaWYoZW50cnkpIHtcbiAgICAgICAgICAgIGlmIChlbnRyeS5zb3VyY2UgPT0gU291cmNlcy5WRVJURVgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJmcmFnX1wiICsgYmFzZU5hbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGJhc2VOYW1lO1xuICAgIH1cblxuICAgIHZhciBoYW5kbGVCaW5hcnlFeHByZXNzaW9uID0gZnVuY3Rpb24gKGJpbmFyeUV4cHJlc3Npb24sIHBhcmVudCwgY2IpIHtcbiAgICAgICAgLy8gSW4gR0wsIHdlIGNhbid0IG1peCB1cCBmbG9hdHMsIGludHMgYW5kIGJvb2xkIGZvciBiaW5hcnkgZXhwcmVzc2lvbnNcbiAgICAgICAgdmFyIGxlZnQgPSBuZXcgQW5ub3RhdGlvbihiaW5hcnlFeHByZXNzaW9uLmxlZnQpLFxuICAgICAgICAgICAgcmlnaHQgPSBuZXcgQW5ub3RhdGlvbihiaW5hcnlFeHByZXNzaW9uLnJpZ2h0KTtcblxuICAgICAgICBpZiAobGVmdC5pc051bWJlcigpICYmIHJpZ2h0LmlzSW50KCkpIHtcbiAgICAgICAgICAgIGJpbmFyeUV4cHJlc3Npb24ucmlnaHQgPSBjYXN0VG9GbG9hdChiaW5hcnlFeHByZXNzaW9uLnJpZ2h0KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChyaWdodC5pc051bWJlcigpICYmIGxlZnQuaXNJbnQoKSkge1xuICAgICAgICAgICAgYmluYXJ5RXhwcmVzc2lvbi5sZWZ0ID0gY2FzdFRvRmxvYXQoYmluYXJ5RXhwcmVzc2lvbi5sZWZ0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChiaW5hcnlFeHByZXNzaW9uLm9wZXJhdG9yID09IFwiJVwiKSB7XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlTW9kdWxvKGJpbmFyeUV4cHJlc3Npb24pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBiaW5hcnlFeHByZXNzaW9uO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNhc3RUb0Zsb2F0KGFzdCkge1xuICAgICAgICB2YXIgZXhwID0gbmV3IEFubm90YXRpb24oYXN0KTtcblxuICAgICAgICBpZiAoIWV4cC5pc051bWJlcigpKSB7ICAgLy8gQ2FzdFxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQ2FsbEV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgY2FsbGVlOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBcImZsb2F0XCJcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50czogW2FzdF1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXN0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNhc3RUb0ludChhc3QsIGZvcmNlKSB7XG4gICAgICAgIHZhciBleHAgPSBuZXcgQW5ub3RhdGlvbihhc3QpO1xuXG4gICAgICAgIGlmICghZXhwLmlzSW50KCkgfHwgZm9yY2UpIHsgICAvLyBDYXN0XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5DYWxsRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBjYWxsZWU6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiaW50XCJcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50czogW2FzdF1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXN0O1xuICAgIH1cblxuICAgIHZhciBoYW5kbGVNb2R1bG8gPSBmdW5jdGlvbiAoYmluYXJ5RXhwcmVzc2lvbikge1xuICAgICAgICBiaW5hcnlFeHByZXNzaW9uLnJpZ2h0ID0gY2FzdFRvRmxvYXQoYmluYXJ5RXhwcmVzc2lvbi5yaWdodCk7XG4gICAgICAgIGJpbmFyeUV4cHJlc3Npb24ubGVmdCA9IGNhc3RUb0Zsb2F0KGJpbmFyeUV4cHJlc3Npb24ubGVmdCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguQ2FsbEV4cHJlc3Npb24sXG4gICAgICAgICAgICBjYWxsZWU6IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgICAgICBuYW1lOiBcIm1vZFwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYXJndW1lbnRzOiBbXG4gICAgICAgICAgICAgICAgYmluYXJ5RXhwcmVzc2lvbi5sZWZ0LFxuICAgICAgICAgICAgICAgIGJpbmFyeUV4cHJlc3Npb24ucmlnaHRcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBleHRyYToge1xuICAgICAgICAgICAgICAgIHR5cGU6IFR5cGVzLk5VTUJFUlxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGhhbmRsZUNvbmRpdGlvbmFsRXhwcmVzc2lvbiA9IGZ1bmN0aW9uKG5vZGUsIHN0YXRlLCByb290KSB7XG4gICAgICAgIHZhciBjb25zZXF1ZW50ID0gbmV3IEFubm90YXRpb24obm9kZS5jb25zZXF1ZW50KTtcbiAgICAgICAgdmFyIGFsdGVybmF0ZSA9IG5ldyBBbm5vdGF0aW9uKG5vZGUuYWx0ZXJuYXRlKTtcbiAgICAgICAgaWYgKGNvbnNlcXVlbnQuY2FuRWxpbWluYXRlKCkpIHtcbiAgICAgICAgICAgIHJldHVybiByb290LnJlcGxhY2Uobm9kZS5hbHRlcm5hdGUsIHN0YXRlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYWx0ZXJuYXRlLmNhbkVsaW1pbmF0ZSgpKSB7XG4gICAgICAgICAgICByZXR1cm4gcm9vdC5yZXBsYWNlKG5vZGUuY29uc2VxdWVudCwgc3RhdGUpO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICB2YXIgaGFuZGxlSWZTdGF0ZW1lbnQgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICB2YXIgY29uc2VxdWVudCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUuY29uc2VxdWVudCk7XG4gICAgICAgIHZhciBhbHRlcm5hdGUgPSBub2RlLmFsdGVybmF0ZSA/IG5ldyBBbm5vdGF0aW9uKG5vZGUuYWx0ZXJuYXRlKSA6IG51bGw7XG4gICAgICAgIGlmIChjb25zZXF1ZW50LmNhbkVsaW1pbmF0ZSgpKSB7XG4gICAgICAgICAgICBpZiAoYWx0ZXJuYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGUuYWx0ZXJuYXRlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguRW1wdHlTdGF0ZW1lbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChhbHRlcm5hdGUgJiYgYWx0ZXJuYXRlLmNhbkVsaW1pbmF0ZSgpKSB7XG4gICAgICAgICAgICByZXR1cm4gbm9kZS5jb25zZXF1ZW50O1xuICAgICAgICB9XG4gICAgICAgIC8vIFdlIHN0aWxsIGhhdmUgYSByZWFsIGlmIHN0YXRlbWVudFxuICAgICAgIHZhciB0ZXN0ID0gbmV3IEFubm90YXRpb24obm9kZS50ZXN0KTtcbiAgICAgICBzd2l0Y2godGVzdC5nZXRUeXBlKCkpIHtcbiAgICAgICAgICAgY2FzZSBUeXBlcy5JTlQ6XG4gICAgICAgICAgIGNhc2UgVHlwZXMuTlVNQkVSOlxuICAgICAgICAgICAgICAgbm9kZS50ZXN0ID0ge1xuICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBcIiE9XCIsXG4gICAgICAgICAgICAgICAgICAgbGVmdDogbm9kZS50ZXN0LFxuICAgICAgICAgICAgICAgICAgIHJpZ2h0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5MaXRlcmFsLFxuICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgZXh0cmE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IHRlc3QuZ2V0VHlwZSgpXG4gICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICB9XG4gICAgICAgfVxuXG5cbiAgICB9O1xuXG4gICAgdmFyIGhhbmRsZUxvZ2ljYWxFeHByZXNzaW9uID0gZnVuY3Rpb24gKG5vZGUsIHJvb3QsIHN0YXRlKSB7XG4gICAgICAgIHZhciBsZWZ0ID0gbmV3IEFubm90YXRpb24obm9kZS5sZWZ0KTtcbiAgICAgICAgdmFyIHJpZ2h0ID0gbmV3IEFubm90YXRpb24obm9kZS5yaWdodCk7XG4gICAgICAgIGlmIChsZWZ0LmNhbkVsaW1pbmF0ZSgpKVxuICAgICAgICAgICAgcmV0dXJuIHJvb3QucmVwbGFjZShub2RlLnJpZ2h0LCBzdGF0ZSk7XG4gICAgICAgIGlmIChyaWdodC5jYW5FbGltaW5hdGUoKSlcbiAgICAgICAgICAgIHJldHVybiByb290LnJlcGxhY2Uobm9kZS5sZWZ0LCBzdGF0ZSk7XG4gICAgfVxuXG4gICAgLy8gRXhwb3J0c1xuICAgIG5zLkdMQVNUVHJhbnNmb3JtZXIgPSBHTEFTVFRyYW5zZm9ybWVyO1xuXG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uIChucykge1xuICAgIHZhciBCYXNlID0gcmVxdWlyZShcIi4vYmFzZS9pbmRleC5qc1wiKTtcbiAgICAvKipcbiAgICAgKiBAZW51bSB7c3RyaW5nfVxuICAgICAqL1xuICAgIG5zLlRZUEVTID0ge1xuICAgICAgICBBTlk6IFwiYW55XCIsXG4gICAgICAgIElOVDogXCJpbnRcIixcbiAgICAgICAgTlVNQkVSOiBcIm51bWJlclwiLFxuICAgICAgICBCT09MRUFOOiBcImJvb2xlYW5cIixcbiAgICAgICAgT0JKRUNUOiBcIm9iamVjdFwiLFxuICAgICAgICBBUlJBWTogXCJhcnJheVwiLFxuICAgICAgICBOVUxMOiBcIm51bGxcIixcbiAgICAgICAgVU5ERUZJTkVEOiBcInVuZGVmaW5lZFwiLFxuICAgICAgICBGVU5DVElPTjogXCJmdW5jdGlvblwiLFxuICAgICAgICBTVFJJTkc6IFwic3RyaW5nXCJcbiAgICB9XG5cbiAgICBucy5PQkpFQ1RfS0lORFMgPSB7XG4gICAgICAgIEFOWTogXCJhbnlcIixcbiAgICAgICAgRkxPQVQyOiBcImZsb2F0MlwiLCAvLyB2aXJ0dWFsIGtpbmRzXG4gICAgICAgIEZMT0FUMzogXCJmbG9hdDNcIiwgLy8gdmlydHVhbCBraW5kc1xuICAgICAgICBGTE9BVDQ6IFwiZmxvYXQ0XCIsIC8vIHZpcnR1YWwga2luZHNcbiAgICAgICAgTk9STUFMOiBcIm5vcm1hbFwiLFxuICAgICAgICBNQVRSSVg0OiBcIm1hdHJpeDRcIixcbiAgICAgICAgTUFUUklYMzogXCJtYXRyaXgzXCIsXG4gICAgICAgIENPTE9SX0NMT1NVUkU6IFwiY29sb3JfY2xvc3VyZVwiXG4gICAgfVxuXG4gICAgbnMuU09VUkNFUyA9IHtcbiAgICAgICAgVU5JRk9STTogXCJ1bmlmb3JtXCIsXG4gICAgICAgIFZFUlRFWDogXCJ2ZXJ0ZXhcIixcbiAgICAgICAgQ09OU1RBTlQ6IFwiY29uc3RhbnRcIlxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZpbGxWZWN0b3IoZGVzdCwgdmVjU2l6ZSwgYXJndW1lbnRzKXtcbiAgICAgICAgdmFyIGNvbG9yID0gZmFsc2U7XG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMCApe1xuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHZlY1NpemU7ICsraSlcbiAgICAgICAgICAgICAgICBkZXN0W2ldID0gMDtcbiAgICAgICAgICAgIGlmKGNvbG9yKSBkZXN0WzNdID0gMTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDEgJiYgIWlzTmFOKGFyZ3VtZW50c1swXSkpe1xuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHZlY1NpemU7ICsraSlcbiAgICAgICAgICAgICAgICBkZXN0W2ldID0gYXJndW1lbnRzWzBdO1xuICAgICAgICAgICAgaWYoY29sb3IpIGRlc3RbM10gPSAxO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGlkeCA9IDA7XG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGlkeCA8IHZlY1NpemUgJiYgaSA8IGFyZ3VtZW50cy5sZW5ndGg7ICsraSl7XG4gICAgICAgICAgICB2YXIgYXJnPSBhcmd1bWVudHNbaV0sIGNudCA9IDE7XG4gICAgICAgICAgICBpZihhcmcgaW5zdGFuY2VvZiBWZWMyKSBjbnQgPSAyO1xuICAgICAgICAgICAgZWxzZSBpZihhcmcgaW5zdGFuY2VvZiBWZWMzKSBjbnQgPSAzO1xuICAgICAgICAgICAgZWxzZSBpZihhcmcgaW5zdGFuY2VvZiBWZWM0KSBjbnQgPSA0O1xuXG4gICAgICAgICAgICBpZihjbnQgPT0gMSlcbiAgICAgICAgICAgICAgICBkZXN0W2lkeCsrXSA9IGFyZyB8fCAwO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIGZvcih2YXIgaiA9IDA7IGlkeCA8IHZlY1NpemUgJiYgaiA8IGNudDsgKytqKXtcbiAgICAgICAgICAgICAgICAgICAgZGVzdFtpZHgrK10gPSBhcmdbal07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmKGkgPCBhcmd1bWVudHMubGVuZ3RoKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVG9vIG1hbnkgYXJndW1lbnRzIGZvciBcIiArIChjb2xvciA/IFwiQ29sb3JcIiA6IFwiVmVjXCIgKyB2ZWNTaXplKSArIFwiLlwiKTtcbiAgICAgICAgaWYoaWR4IDwgdmVjU2l6ZSl7XG4gICAgICAgICAgICBpZihjb2xvciAmJiAoaWR4ID09IDMpKVxuICAgICAgICAgICAgICAgIGRlc3RbM10gPSAxO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCBlbm91Z2ggYXJndW1lbnRzIGZvciBcIiArIChjb2xvciA/IFwiQ29sb3JcIiA6IFwiVmVjXCIgKyB2ZWNTaXplKSArIFwiLlwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgLy8gVE9ETzogR2VuZXJhdGUgU3dpenpsZSBmdW5jdGlvbnNcbiAgICB2YXIgU1dJWlpMRV9LRVlTID0gW1xuICAgICAgICBbJ3gnLCd5JywneicsJ3cnXSxcbiAgICAgICAgWydyJywgJ2cnLCAnYicsICdhJ10sXG4gICAgICAgIFsncycsICd0JywgJ3AnLCAncSddXG4gICAgXVxuXG4gICAgZnVuY3Rpb24gYWRkU3dpenpsZXMocHJvdG90eXBlLCB2ZWNDb3VudCwgbWFza0NvdW50LCB3aXRoU2V0dGVyKXtcbiAgICAgICAgdmFyIG1heCA9IE1hdGgucG93KHZlY0NvdW50LCBtYXNrQ291bnQpO1xuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgbWF4OyArK2kpe1xuICAgICAgICAgICAgdmFyIGluZGljZXMgPSBbXSwga2V5cyA9IFtcIlwiLCBcIlwiLCBcIlwiXSwgdmFsID0gaSwgYXJncyA9IFtdO1xuICAgICAgICAgICAgdmFyIHNldHRlckFyZ3MgPSBbXSwgZ2VuZXJhdGVTZXR0ZXIgPSB3aXRoU2V0dGVyO1xuICAgICAgICAgICAgZm9yKHZhciBqID0gMDsgaiA8IG1hc2tDb3VudDsgKytqKXtcbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gdmFsICUgdmVjQ291bnQ7XG4gICAgICAgICAgICAgICAgaW5kaWNlcy5wdXNoKGlkeCk7XG4gICAgICAgICAgICAgICAgaWYoZ2VuZXJhdGVTZXR0ZXIpe1xuICAgICAgICAgICAgICAgICAgICBpZihzZXR0ZXJBcmdzW2lkeF0gPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldHRlckFyZ3NbaWR4XSA9ICdvdGhlclsnICsgaiArICddJztcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVTZXR0ZXIgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZm9yKHZhciBrID0gMDsgayA8IFNXSVpaTEVfS0VZUy5sZW5ndGg7ICsrayl7XG4gICAgICAgICAgICAgICAgICAgIGtleXNba10gKz0gU1dJWlpMRV9LRVlTW2tdW2lkeF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhbCA9IE1hdGguZmxvb3IodmFsIC8gdmVjQ291bnQpO1xuICAgICAgICAgICAgICAgIGFyZ3MucHVzaCgndGhpc1snKyBpZHggKyAnXScgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGZ1bmNBcmdzID0gXCJcIjtcbiAgICAgICAgICAgIHZhciBib2R5ID0gJyAgcmV0dXJuIGdldFZlYycgKyBtYXNrQ291bnQgKyAnLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XFxuJztcbiAgICAgICAgICAgIGlmKGdlbmVyYXRlU2V0dGVyKXtcbiAgICAgICAgICAgICAgICBmb3IodmFyIGogPSAwOyBqIDwgdmVjQ291bnQ7ICsrail7XG4gICAgICAgICAgICAgICAgICAgIGlmKHNldHRlckFyZ3Nbal0gPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldHRlckFyZ3Nbal0gPSAndGhpc1snICsgaiArICddJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3dpdGNoKG1hc2tDb3VudCl7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMiA6IGZ1bmNBcmdzID0gXCJ4LCB5XCI7IGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDMgOiBmdW5jQXJncyA9IFwieCwgeSwgelwiOyBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0IDogZnVuY0FyZ3MgPSBcIngsIHksIHosIHdcIjsgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYm9keSA9IFwiICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXFxuICBcIiArIGJvZHkgK1xuICAgICAgICAgICAgICAgICAgICAgICBcIiAgZWxzZXtcXG5cIiArXG4gICAgICAgICAgICAgICAgICAgICAgIFwiICAgIHZhciBvdGhlcj1nZXRWZWNcIiArIG1hc2tDb3VudCArICcuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgXCIgICAgcmV0dXJuIGdldFZlY1wiICsgdmVjQ291bnQgKyAnKCcgKyBzZXR0ZXJBcmdzLmpvaW4oXCIsIFwiKSArICcpO1xcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICBcIiAgfVxcblwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGZ1bmN0aW9uQ29kZSA9ICdmdW5jdGlvbignICsgZnVuY0FyZ3MgKyAgJyl7XFxuJyArIGJvZHkgKyAnfSc7XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IGV2YWwoXCIoXCIgKyBmdW5jdGlvbkNvZGUgKyBcIilcIik7XG4gICAgICAgICAgICAgICAgZm9yKHZhciBqID0gMDsgaiA8IGtleXMubGVuZ3RoOyArK2opXG4gICAgICAgICAgICAgICAgICAgIHByb3RvdHlwZVtrZXlzW2pdXSA9IHJlc3VsdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoKGUpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBDb21waWxpbmcgQ29kZTpcXG5cIiArIGZ1bmN0aW9uQ29kZSk7XG4gICAgICAgICAgICAgICAgdGhyb3cgZTtcblxuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogVGhlIHZpcnR1YWwgVmVjMiB0eXBlXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgIHZhciBWZWMyID0gZnVuY3Rpb24oeCwgeSl7XG4gICAgICAgIGZpbGxWZWN0b3IodGhpcywgMiwgYXJndW1lbnRzKTtcbiAgICAgfVxuXG5cbiAgICAgZnVuY3Rpb24gZ2V0VmVjMigpe1xuICAgICAgICBpZihhcmd1bWVudHNbMF0gaW5zdGFuY2VvZiBWZWMyKVxuICAgICAgICAgICAgcmV0dXJuIGFyZ3VtZW50c1swXTtcbiAgICAgICAgdmFyIG9iaiA9ICBuZXcgVmVjMigpO1xuICAgICAgICBWZWMyLmFwcGx5KG9iaiwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgfVxuXG4gICAgIFZlYzIucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKHgsIHkpeyAvLyAwIGFyZ3VtZW50cyA9PiBpZGVudGl0eSBvciBlcnJvcj9cbiAgICAgICAgdmFyIGFkZCA9IGdldFZlYzIuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXNbMF0gKyBhZGRbMF0sIHRoaXNbMV0gKyBhZGRbMV0pO1xuICAgICB9XG4gICAgIFZlYzIucHJvdG90eXBlLnN1YiA9IGZ1bmN0aW9uKHgsIHkpe1xuICAgICAgICB2YXIgc3ViID0gZ2V0VmVjMi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpc1swXSAtIHN1YlswXSwgdGhpc1sxXSAtIHN1YlsxXSk7XG4gICAgIH1cbiAgICAgVmVjMi5wcm90b3R5cGUubXVsID0gZnVuY3Rpb24oeCwgeSl7XG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzIuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXNbMF0gKiBvdGhlclswXSwgdGhpc1sxXSAqIG90aGVyWzFdKTtcbiAgICAgfVxuICAgICBWZWMyLnByb3RvdHlwZS5kaXYgPSBmdW5jdGlvbih4LCB5KXtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjMi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpc1swXSAvIG90aGVyWzBdLCB0aGlzWzFdIC8gb3RoZXJbMV0pO1xuICAgICB9XG4gICAgIFZlYzIucHJvdG90eXBlLm1vZCA9IGZ1bmN0aW9uKHgsIHkpe1xuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWMyLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzWzBdICUgb3RoZXJbMF0sIHRoaXNbMV0gJSBvdGhlclsxXSk7XG4gICAgIH1cbiAgICAgVmVjMi5wcm90b3R5cGUuZG90ID0gZnVuY3Rpb24oeCwgeSl7XG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzIuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIHRoaXNbMF0qb3RoZXJbMF0gKyB0aGlzWzFdKm90aGVyWzFdO1xuICAgICB9XG4gICAgIFZlYzIucHJvdG90eXBlLmFicyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiBuZXcgVmVjMihNYXRoLmFicyh0aGlzWzBdKSwgTWF0aC5hYnModGhpc1sxXSkpO1xuICAgICB9XG4gICAgIFZlYzIucHJvdG90eXBlLmxlbmd0aCA9IGZ1bmN0aW9uKGxlbmd0aCl7XG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcbiAgICAgICAgICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy5kb3QodGhpcykpO1xuICAgICAgICBlbHNle1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubXVsKGxlbmd0aCAvIHRoaXMubGVuZ3RoKCkpO1xuICAgICAgICB9XG4gICAgIH1cbiAgICAgVmVjMi5wcm90b3R5cGUubm9ybWFsaXplID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIHRoaXMubGVuZ3RoKDEpO1xuICAgICB9XG5cbiAgICAgVmVjMi5wcm90b3R5cGUueHkgPSBWZWMyLnByb3RvdHlwZS5yZyA9IFZlYzIucHJvdG90eXBlLnN0ID0gZnVuY3Rpb24oeCx5KXtcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICByZXR1cm4gZ2V0VmVjMi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgIH1cbiAgICAgVmVjMi5wcm90b3R5cGUueCA9IFZlYzIucHJvdG90eXBlLnIgPSBWZWMyLnByb3RvdHlwZS5zID0gZnVuY3Rpb24oeCl7XG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcbiAgICAgICAgICAgIHJldHVybiB0aGlzWzBdO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4gdGhpcy54eSh4LCB0aGlzWzFdKTtcbiAgICAgfVxuICAgICBWZWMyLnByb3RvdHlwZS55ID0gVmVjMi5wcm90b3R5cGUuZyA9IFZlYzIucHJvdG90eXBlLnQgPSBmdW5jdGlvbih5KXtcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXNbMV07XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnh5KHRoaXNbMF0sIHkpO1xuICAgICB9XG5cbiAgICAgYWRkU3dpenpsZXMoVmVjMi5wcm90b3R5cGUsIDIsIDIsIHRydWUpO1xuICAgICBhZGRTd2l6emxlcyhWZWMyLnByb3RvdHlwZSwgMiwgMywgZmFsc2UpO1xuICAgICBhZGRTd2l6emxlcyhWZWMyLnByb3RvdHlwZSwgMiwgNCwgZmFsc2UpO1xuXG5cblxuICAgICAvKipcbiAgICAgICogVGhlIHZpcnR1YWwgVmVjMyB0eXBlXG4gICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgKi9cbiAgICAgdmFyIFZlYzMgPSBmdW5jdGlvbih4LCB5LCB6ICl7XG4gICAgICAgIGZpbGxWZWN0b3IodGhpcywgMywgYXJndW1lbnRzKTtcbiAgICAgfVxuXG4gICAgIGZ1bmN0aW9uIGdldFZlYzMoKXtcbiAgICAgICAgaWYoYXJndW1lbnRzWzBdIGluc3RhbmNlb2YgVmVjMylcbiAgICAgICAgICAgIHJldHVybiBhcmd1bWVudHNbMF07XG4gICAgICAgIHZhciBvYmogPSBuZXcgVmVjMygpO1xuICAgICAgICBWZWMzLmFwcGx5KG9iaiwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgfVxuXG4gICAgIFZlYzMucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKHgsIHksIHope1xuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWMzLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzWzBdICsgb3RoZXJbMF0sIHRoaXNbMV0gKyBvdGhlclsxXSwgdGhpc1syXSArIG90aGVyWzJdKTtcbiAgICAgfVxuICAgICBWZWMzLnByb3RvdHlwZS5zdWIgPSBmdW5jdGlvbih4LCB5LCB6KXtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjMy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpc1swXSAtIG90aGVyWzBdLCB0aGlzWzFdIC0gb3RoZXJbMV0sIHRoaXNbMl0gLSBvdGhlclsyXSk7XG4gICAgIH1cbiAgICAgVmVjMy5wcm90b3R5cGUubXVsID0gZnVuY3Rpb24oeCwgeSwgeil7XG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzMuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHRoaXNbMF0gKiBvdGhlclswXSwgdGhpc1sxXSAqIG90aGVyWzFdLCB0aGlzWzJdICogb3RoZXJbMl0pO1xuICAgICB9XG4gICAgIFZlYzMucHJvdG90eXBlLmRpdiA9IGZ1bmN0aW9uKHgsIHksIHope1xuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWMzLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzWzBdIC8gb3RoZXJbMF0sIHRoaXNbMV0gLyBvdGhlclsxXSwgdGhpc1syXSAvIG90aGVyWzJdKTtcbiAgICAgfVxuICAgICBWZWMzLnByb3RvdHlwZS5tb2QgPSBmdW5jdGlvbih4LCB5LCB6KXtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjMy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpc1swXSAlIG90aGVyWzBdLCB0aGlzWzFdICUgb3RoZXJbMV0sIHRoaXNbMl0gJSBvdGhlclsyXSk7XG4gICAgIH1cbiAgICAgVmVjMy5wcm90b3R5cGUuYWJzID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKE1hdGguYWJzKHRoaXNbMF0pLCBNYXRoLmFicyh0aGlzWzFdKSwgTWF0aC5hYnModGhpc1syXSkpO1xuICAgICB9XG4gICAgIFZlYzMucHJvdG90eXBlLmRvdCA9IGZ1bmN0aW9uKHgsIHksIHope1xuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWMzLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiB0aGlzWzBdKm90aGVyWzBdICsgdGhpc1sxXSpvdGhlclsxXSArIHRoaXNbMl0qb3RoZXJbMl07XG4gICAgIH1cbiAgICAgVmVjMy5wcm90b3R5cGUuY3Jvc3MgPSBmdW5jdGlvbih4LCB5LCB6KXtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjMy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICB2YXIgeCA9IHRoaXNbMV0qb3RoZXJbMl0gLSBvdGhlclsxXSp0aGlzWzJdO1xuICAgICAgICB2YXIgeSA9IHRoaXNbMl0qb3RoZXJbMF0gLSBvdGhlclsyXSp0aGlzWzBdO1xuICAgICAgICB2YXIgeiA9IHRoaXNbMF0qb3RoZXJbMV0gLSBvdGhlclswXSp0aGlzWzFdO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzMoeCwgeSwgeik7XG4gICAgIH1cbiAgICAgVmVjMy5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24obGVuZ3RoKXtcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxuICAgICAgICAgICAgcmV0dXJuIE1hdGguc3FydCh0aGlzLmRvdCh0aGlzKSk7XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tdWwobGVuZ3RoIC8gdGhpcy5sZW5ndGgoKSk7XG4gICAgICAgIH1cbiAgICAgfVxuICAgICBWZWMzLnByb3RvdHlwZS5ub3JtYWxpemUgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gdGhpcy5sZW5ndGgoMSk7XG4gICAgIH1cbiAgICAgVmVjMy5wcm90b3R5cGUueHl6ID0gVmVjMy5wcm90b3R5cGUucmdiID0gVmVjMy5wcm90b3R5cGUuc3RwID0gZnVuY3Rpb24oeCwgeSwgeil7XG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4gbmV3IFZlYzMoeCwgeSwgeik7XG4gICAgIH1cbiAgICAgVmVjMy5wcm90b3R5cGUueCA9IFZlYzMucHJvdG90eXBlLnIgPSBWZWMzLnByb3RvdHlwZS5zID0gZnVuY3Rpb24oeCl7XG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcbiAgICAgICAgICAgIHJldHVybiB0aGlzWzBdO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4gbmV3IFZlYzMoeCwgdGhpc1sxXSwgdGhpc1syXSk7XG4gICAgIH1cbiAgICAgVmVjMy5wcm90b3R5cGUueSA9IFZlYzMucHJvdG90eXBlLmcgPSBWZWMzLnByb3RvdHlwZS50ID0gZnVuY3Rpb24oeSl7XG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcbiAgICAgICAgICAgIHJldHVybiB0aGlzWzFdO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpc1swXSwgeSwgdGhpc1syXSk7XG4gICAgIH1cbiAgICAgVmVjMy5wcm90b3R5cGUueiA9IFZlYzMucHJvdG90eXBlLmIgPSBWZWMzLnByb3RvdHlwZS5wID0gZnVuY3Rpb24oeil7XG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcbiAgICAgICAgICAgIHJldHVybiB0aGlzWzJdO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpc1swXSwgdGhpc1sxXSwgeik7XG4gICAgIH1cbiAgICAgYWRkU3dpenpsZXMoVmVjMy5wcm90b3R5cGUsIDMsIDIsIHRydWUpO1xuICAgICBhZGRTd2l6emxlcyhWZWMzLnByb3RvdHlwZSwgMywgMywgdHJ1ZSk7XG4gICAgIGFkZFN3aXp6bGVzKFZlYzMucHJvdG90eXBlLCAzLCA0LCBmYWxzZSk7XG5cblxuICAgICAvKipcbiAgICAgICogVGhlIHZpcnR1YWwgVmVjNCB0eXBlXG4gICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgKi9cbiAgICAgdmFyIFZlYzQgPSBmdW5jdGlvbih4LCB5LCB6LCB3ICl7XG4gICAgICAgIGZpbGxWZWN0b3IodGhpcywgNCwgYXJndW1lbnRzKVxuICAgICB9XG5cbiAgICAgZnVuY3Rpb24gZ2V0VmVjNCgpe1xuICAgICAgICBpZihhcmd1bWVudHNbMF0gaW5zdGFuY2VvZiBWZWM0KVxuICAgICAgICAgICAgcmV0dXJuIGFyZ3VtZW50c1swXTtcbiAgICAgICAgdmFyIG9iaiA9IG5ldyBWZWM0KCk7XG4gICAgICAgIFZlYzQuYXBwbHkob2JqLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICB9XG5cbiAgICAgVmVjNC5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24oeCwgeSwgeiwgdyl7XG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzQuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KHRoaXNbMF0gKyBvdGhlclswXSwgdGhpc1sxXSArIG90aGVyWzFdLCB0aGlzWzJdICsgb3RoZXJbMl0sIHRoaXNbM10gKyBvdGhlclszXSk7XG4gICAgIH1cbiAgICAgVmVjNC5wcm90b3R5cGUuc3ViID0gZnVuY3Rpb24oeCwgeSwgeiwgdyl7XG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzQuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KHRoaXNbMF0gLSBvdGhlclswXSwgdGhpc1sxXSAtIG90aGVyWzFdLCB0aGlzWzJdIC0gb3RoZXJbMl0sIHRoaXNbM10gLSBvdGhlclszXSk7XG4gICAgIH1cbiAgICAgVmVjNC5wcm90b3R5cGUubXVsID0gZnVuY3Rpb24oeCwgeSwgeiwgdyl7XG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzQuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KHRoaXNbMF0gKiBvdGhlclswXSwgdGhpc1sxXSAqIG90aGVyWzFdLCB0aGlzWzJdICogb3RoZXJbMl0sIHRoaXNbM10gKiBvdGhlclszXSk7XG4gICAgIH1cbiAgICAgVmVjNC5wcm90b3R5cGUuZGl2ID0gZnVuY3Rpb24oeCwgeSwgeiwgdyl7XG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzQuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KHRoaXNbMF0gLyBvdGhlclswXSwgdGhpc1sxXSAvIG90aGVyWzFdLCB0aGlzWzJdIC8gb3RoZXJbMl0sIHRoaXNbM10gLyBvdGhlclszXSk7XG4gICAgIH1cbiAgICAgVmVjNC5wcm90b3R5cGUubW9kID0gZnVuY3Rpb24oeCwgeSwgeiwgdyl7XG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzQuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KHRoaXNbMF0gJSBvdGhlclswXSwgdGhpc1sxXSAlIG90aGVyWzFdLCB0aGlzWzJdICUgb3RoZXJbMl0sIHRoaXNbM10gJSBvdGhlclszXSk7XG4gICAgIH1cbiAgICAgVmVjNC5wcm90b3R5cGUuYWJzID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KE1hdGguYWJzKHRoaXNbMF0pLCBNYXRoLmFicyh0aGlzWzFdKSwgTWF0aC5hYnModGhpc1syXSksIE1hdGguYWJzKHRoaXNbM10pKTtcbiAgICAgfVxuICAgICBWZWM0LnByb3RvdHlwZS5kb3QgPSBmdW5jdGlvbih4LCB5LCB6LCB3KXtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjNC5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gdGhpc1swXSpvdGhlclswXSArIHRoaXNbMV0qb3RoZXJbMV0gKyB0aGlzWzJdKm90aGVyWzJdICsgdGhpc1szXSpvdGhlclszXTtcbiAgICAgfVxuICAgICBWZWM0LnByb3RvdHlwZS5sZW5ndGggPSBmdW5jdGlvbihsZW5ndGgpe1xuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXG4gICAgICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMuZG90KHRoaXMpKTtcbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm11bChsZW5ndGggLyB0aGlzLmxlbmd0aCgpKTtcbiAgICAgICAgfVxuICAgICB9XG4gICAgIFZlYzQucHJvdG90eXBlLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiB0aGlzLmxlbmd0aCgxKTtcbiAgICAgfVxuICAgICBWZWM0LnByb3RvdHlwZS54eXp3ID0gVmVjNC5wcm90b3R5cGUucmdiYSA9IFZlYzQucHJvdG90eXBlLnN0cHEgPSBmdW5jdGlvbih4LCB5LCB6LCB3KXtcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiBnZXRWZWM0LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgIH1cbiAgICAgVmVjNC5wcm90b3R5cGUueCA9IFZlYzQucHJvdG90eXBlLnIgPSBWZWM0LnByb3RvdHlwZS5zID0gZnVuY3Rpb24oeCl7XG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcbiAgICAgICAgICAgIHJldHVybiB0aGlzWzBdO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4gZ2V0VmVjNCh4LCB0aGlzWzFdLCB0aGlzWzJdLCB0aGlzWzNdKTtcbiAgICAgfVxuXG4gICAgIFZlYzQucHJvdG90eXBlLnkgPSBWZWM0LnByb3RvdHlwZS5nID0gVmVjNC5wcm90b3R5cGUudCA9IGZ1bmN0aW9uKHkpe1xuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXG4gICAgICAgICAgICByZXR1cm4gdGhpc1sxXTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIGdldFZlYzQodGhpc1swXSwgeSwgdGhpc1syXSwgdGhpc1szXSk7XG4gICAgIH1cbiAgICAgVmVjNC5wcm90b3R5cGUueiA9IFZlYzQucHJvdG90eXBlLmIgPSBWZWM0LnByb3RvdHlwZS5wID0gZnVuY3Rpb24oeil7XG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcbiAgICAgICAgICAgIHJldHVybiB0aGlzWzJdO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4gZ2V0VmVjNCh0aGlzWzBdLCB0aGlzWzFdLCB6LCB0aGlzWzNdKTtcbiAgICAgfVxuICAgICBWZWM0LnByb3RvdHlwZS53ID0gVmVjNC5wcm90b3R5cGUuYSA9IFZlYzQucHJvdG90eXBlLnEgPSBmdW5jdGlvbih3KXtcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXNbM107XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiBnZXRWZWM0KHRoaXNbMF0sIHRoaXNbMV0sdGhpc1syXSwgdyApO1xuICAgICB9XG4gICAgIGFkZFN3aXp6bGVzKFZlYzQucHJvdG90eXBlLCA0LCAyLCB0cnVlKTtcbiAgICAgYWRkU3dpenpsZXMoVmVjNC5wcm90b3R5cGUsIDQsIDMsIHRydWUpO1xuICAgICBhZGRTd2l6emxlcyhWZWM0LnByb3RvdHlwZSwgNCwgNCwgdHJ1ZSk7XG5cbiAgICAgLyoqXG4gICAgICAqIFRoZSB2aXJ0dWFsIENvbG9yIHR5cGVcbiAgICAgICogQGNvbnN0cnVjdG9yXG4gICAgICAqL1xuICAgICB2YXIgQ29sb3IgPSBWZWM0O1xuXG4gICAgdmFyIFNoYWRlID0ge307XG5cbiAgICBTaGFkZS5jbGFtcCA9IGZ1bmN0aW9uKHgsIG1pblZhbCwgbWF4VmFsKSB7XG4gICAgICAgIHJldHVybiBNYXRoLm1pbihNYXRoLm1heCh4LCBtaW5WYWwpLCBtYXhWYWwpO1xuICAgIH07XG5cbiAgICBTaGFkZS5zbW9vdGhzdGVwID0gZnVuY3Rpb24oZWRnZTEsIGVkZ2UyLCB4KSB7XG4gICAgICAgIHZhciB0ID0gU2hhZGUuY2xhbXAoKHggLSBlZGdlMSkgLyAoZWRnZTIgLSBlZGdlMSksIDAuMCwgMS4wKTtcbiAgICAgICAgcmV0dXJuIHQgKiB0ICogKDMuMCAtIDIuMCAqIHQpO1xuICAgIH07XG5cbiAgICBTaGFkZS5zdGVwID0gZnVuY3Rpb24oZWRnZSwgeCkge1xuICAgICAgICByZXR1cm4geCA8IGVkZ2UgPyAwIDogMTtcbiAgICB9O1xuXG4gICAgU2hhZGUuZnJhY3QgPSBmdW5jdGlvbih4KSB7XG4gICAgICAgIHJldHVybiB4IC0gTWF0aC5mbG9vcih4KTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBub2RlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1zZ1xuICAgICAqL1xuICAgIG5zLnRocm93RXJyb3IgPSBmdW5jdGlvbihub2RlLCBtc2cpIHtcbiAgICAgICAgdmFyIGxvYyA9IG5vZGUgJiYgbm9kZS5sb2M7XG4gICAgICAgIGlmIChsb2MgJiYgbG9jLnN0YXJ0LmxpbmUpIHtcbiAgICAgICAgICAgIG1zZyA9IFwiTGluZSBcIiArIGxvYy5zdGFydC5saW5lICsgXCI6IFwiICsgbXNnO1xuICAgICAgICB9XG4gICAgICAgIHZhciBlcnJvciA9IG5ldyBFcnJvcihtc2cpO1xuICAgICAgICBlcnJvci5sb2MgPSBsb2M7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgIH1cblxuICAgIG5zLlZlYzIgPSBWZWMyO1xuICAgIG5zLlZlYzMgPSBWZWMzO1xuICAgIG5zLlZlYzQgPSBWZWM0O1xuICAgIG5zLkNvbG9yID0gQ29sb3I7XG4gICAgbnMuU2hhZGUgPSBTaGFkZTtcblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24gKG5zKSB7XG4gICAgdmFyIHBhcnNlciA9IHJlcXVpcmUoJ2VzcHJpbWEnKSxcbiAgICAgICAgcGFyYW1ldGVycyA9IHJlcXVpcmUoXCIuL2FuYWx5emUvcGFyYW1ldGVycy5qc1wiKSxcbiAgICAgICAgaW50ZXJmYWNlcyA9IHJlcXVpcmUoXCIuL2ludGVyZmFjZXMuanNcIiksXG4gICAgICAgIGluZmVyZW5jZSA9IHJlcXVpcmUoXCIuL2FuYWx5emUvdHlwZWluZmVyZW5jZS90eXBlaW5mZXJlbmNlLmpzXCIpLFxuICAgICAgICBCYXNlID0gcmVxdWlyZShcIi4vYmFzZS9pbmRleC5qc1wiKSxcbiAgICAgICAgR0xTTENvbXBpbGVyID0gcmVxdWlyZShcIi4vZ2VuZXJhdGUvZ2xzbC9jb21waWxlci5qc1wiKS5HTFNMQ29tcGlsZXI7XG5cblxuXG4gICAgQmFzZS5leHRlbmQobnMsIHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQW5hbHl6ZXMgYSBqYXZhc2NyaXB0IHByb2dyYW0gYW5kIHJldHVybnMgYSBsaXN0IG9mIHBhcmFtZXRlcnNcbiAgICAgICAgICogQHBhcmFtIHtmdW5jdGlvbigpfHN0cmluZykgZnVuY1xuICAgICAgICAgKiBAcmV0dXJucyB7b2JqZWN0IX1cbiAgICAgICAgICovXG4gICAgICAgIGV4dHJhY3RQYXJhbWV0ZXJzOiBmdW5jdGlvbiAoZnVuYywgb3B0KSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGZ1bmMgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIGZ1bmMgPSBmdW5jLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgYXN0ID0gcGFyc2VyLnBhcnNlKGZ1bmMpO1xuXG4gICAgICAgICAgICByZXR1cm4gcGFyYW1ldGVycy5leHRyYWN0UGFyYW1ldGVycyhhc3QsIG9wdCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcGFyc2VBbmRJbmZlcmVuY2VFeHByZXNzaW9uOiBmdW5jdGlvbiAoc3RyLCBvcHQpIHtcbiAgICAgICAgICAgIG9wdCA9IG9wdCB8fCB7fTtcbiAgICAgICAgICAgIHZhciBhc3QgPSBwYXJzZXIucGFyc2Uoc3RyLCB7cmF3OiB0cnVlLCBsb2M6IG9wdC5sb2MgfHwgZmFsc2UgfSk7XG4gICAgICAgICAgICB2YXIgYWFzdCA9IGluZmVyZW5jZS5pbmZlcihhc3QsIG9wdCk7XG4gICAgICAgICAgICByZXR1cm4gYWFzdDtcbiAgICAgICAgfSxcblxuICAgICAgICBjb21waWxlRnJhZ21lbnRTaGFkZXI6IGZ1bmN0aW9uKGFhc3Qpe1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBHTFNMQ29tcGlsZXIoKS5jb21waWxlRnJhZ21lbnRTaGFkZXIoYWFzdCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgVFlQRVMgOiBpbnRlcmZhY2VzLlRZUEVTLFxuICAgICAgICBPQkpFQ1RfS0lORFMgOiBpbnRlcmZhY2VzLk9CSkVDVF9LSU5EUyxcbiAgICAgICAgU09VUkNFUzogaW50ZXJmYWNlcy5TT1VSQ0VTLFxuICAgICAgICBWZWMyOiBpbnRlcmZhY2VzLlZlYzIsXG4gICAgICAgIFZlYzM6IGludGVyZmFjZXMuVmVjMyxcbiAgICAgICAgVmVjNDogaW50ZXJmYWNlcy5WZWM0LFxuICAgICAgICBDb2xvcjogaW50ZXJmYWNlcy5Db2xvclxuXG59KTtcbiAgICAvKipcbiAgICAgKiBMaWJyYXJ5IHZlcnNpb246XG4gICAgICovXG4gICAgbnMudmVyc2lvbiA9ICcwLjAuMSc7XG5cbn0oZXhwb3J0cykpO1xuIl19
;