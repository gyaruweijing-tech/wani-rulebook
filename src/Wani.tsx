import { useRef, useState } from 'react'
import './wani.css'

// ルールブックの番人ワニ。クリックすると口をパクパクする
function Wani() {
  const [chomping, setChomping] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  function chomp() {
    setChomping(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setChomping(false), 1800)
  }

  return (
    <div className="wani-box" onClick={chomp} title="番人をつつく">
      <div className={`wani-stage ${chomping ? 'wani-chomping' : ''}`}>
        <div className="wani-shadow" />
        <div className="wani-breathe">
          {/* 尻尾 */}
          <div className="wani-tail" />
          <div className="wani-ridge wani-ridge-t1" />
          <div className="wani-ridge wani-ridge-t2" />

          {/* 脚と足 */}
          <div className="wani-leg wani-leg-back" />
          <div className="wani-leg wani-leg-front" />
          <div className="wani-foot wani-foot-back" />
          <div className="wani-foot wani-foot-front" />

          {/* 胴体と背中のトゲ */}
          <div className="wani-body" />
          <div className="wani-ridge wani-ridge-b1" />
          <div className="wani-ridge wani-ridge-b2" />
          <div className="wani-ridge wani-ridge-b3" />

          {/* 頭 */}
          <div className="wani-head">
            <div className="wani-skull" />
            <div className="wani-eye">
              <div className="wani-eye-white">
                <div className="wani-pupil" />
              </div>
            </div>
            <div className="wani-jaw-upper">
              <div className="wani-nostril" />
              <div className="wani-teeth wani-teeth-upper">
                <span /><span /><span /><span />
              </div>
            </div>
            <div className="wani-jaw-lower">
              <div className="wani-teeth wani-teeth-lower">
                <span /><span /><span />
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="wani-caption">ルールブックの番人</p>
    </div>
  )
}

export default Wani
