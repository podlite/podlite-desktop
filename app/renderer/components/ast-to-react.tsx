import React from 'react'
import{ useMemo}  from 'react'
//@ts-ignore
import toAny  from 'pod6/built/exportAny'
import { isNamedBlock } from 'pod6/built/helpers/makeTransformer'
//@ts-ignore
import {isValidElementType} from  'react-is'
import { parse} from 'pod6'
let i_key_i = 0;
const createElement = React.createElement

const mapToReact = {
    // ':blankline': ({children})=><br/>,
    ':blankline': ({children})=>null,
    
    'para':({line,children})=>(<p data-line={line} className="line-src" id={`line-${line}`}>{children}</p>), 
    ':para':({line,children})=>(<p data-line={line} className="line-src" id={`line-${line}`}>{children}</p>), 
    
    'pod': ({children})=><>{children}</>,
    ':text' : ({value}) =>value,
    'head':({level,children, line})=>React.createElement(`h${level}`,{'data-line':line, className:"line-src", id:`line-${line}`}, children),
    'C<>':({children})=>createElement('code', {}, children),
    ':list':({children, list})=>createElement(list === 'ordered' ? 'ol' : 'ul',{}, children),
    'item':({children})=>createElement('li', {}, children),
    'L<>': ({content, children})=>createElement('a',{href:content[0]}, children),
    'B<>': 'b',
    'I<>': 'i',
    'Image':({content, children})=>createElement('img',{src:content[0].value}),
    'code': ({content, children})=>createElement('pre',{}, createElement('code',{},children)),
    ':nested' : 'blockquote',
    'nested' : 'blockquote',
    ':table':'table',
    ':table_row':'tr',
    ':table_cell':'td',
    ':verbatim' : ({value}) =>value,
    'TITLE': ({level=1,children})=>React.createElement(`h${level}`,{}, children),
    'DESCRIPTION': ({level=1,children})=>React.createElement(`h${level}`,{}, children),
}



export function  AstToReact ({file,plugins={}}:{file:string, plugins?:any},...args) {
    const content = file
    // const fileNameExtension = path.parse(file).ext
    // const type = 'pod6'
    const   ast = useMemo( ()=>parse( content), [content])
    const map2react = {
        ...mapToReact,
        ...plugins
    }
    const rules = {}
    let i_key_i = 0;
    let mapByType= {}
    const getIdForNode = ({type="notype",name="noname"}) =>{
        const type_idx = `${type}_${name}`
        if ( ! mapByType[type_idx]  ) { mapByType[type_idx] = 0}
        ++mapByType[type_idx]
        return `${type_idx}_${mapByType[type_idx]}`
    }
    Object.keys(map2react).map((ruleName)=>{ 
        const makeElement = map2react[ruleName]
        
        rules[ruleName] = ( writer, processor )=>( node, ctx, interator )=>{
            
            // if( ['Dia', 'para', ':para'].includes(ruleName)) {
                if(true) {
                console.log('Dia here!')
                const { content, location, ...attr} = node
                const key = node.type ? getIdForNode(node) : ++i_key_i
                console.log({key, node})
                const children = content ? interator(content, { ...ctx}) : undefined
                const result = makeElement({ ...attr, content, key , children, line: location?.start.line}, children)
                if (!isValidElementType(makeElement)) {
                    throw new Error(`Bad React element for ${ruleName} rule `)
                }
                return result
            }
            if (!isValidElementType(makeElement)) {
                throw new Error(`Bad React element for ${ruleName} rule `)
            }
            const { content, location, ...attr} = node
            // console.log(JSON.stringify({node, location}, null,2))
            // const key = location ? [node.type,++i_key_i].join('-') : ++i_key_i
            const key = node.type ? getIdForNode(node) : ++i_key_i
            const children = content ? interator(content, { ...ctx}) : undefined
            return React.createElement(makeElement,{ ...attr, content, key , line: location?.start.line }, children  )
        }
    })
      const  res = useMemo( ()=>
        toAny({processor:1})
        .use({'*:*':( writer, processor )=>( node, ctx, interator )=>{

            // skip named blocks
            if (isNamedBlock) {
                return null
            }
            if ( node.hasOwnProperty('content')) {
               return  interator( node.content, ctx)
            }
            console.warn(JSON.stringify(node,null,2))
            // return undefined
            return React.createElement('code',{key:++i_key_i},`not supported node:${JSON.stringify(node,null,2)}`)
            if (node.children) interator(node.children, { ...ctx})
        }})
        .use(rules)
        .run(ast)
    ,[ast])
    return res.interator
}
