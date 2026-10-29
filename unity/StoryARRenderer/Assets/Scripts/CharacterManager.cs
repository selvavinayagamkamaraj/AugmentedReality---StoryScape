using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace StoryAR.Unity
{
    public class CharacterManager : MonoBehaviour
    {
        [Header("Prefabs / Models")]
        [SerializeField] private GameObject spidermanPrefab;
        [SerializeField] private GameObject batPrefab;
        [SerializeField] private GameObject catPrefab;
        [SerializeField] private GameObject birdPrefab;
        [SerializeField] private GameObject defaultHeroPrefab;

        private Dictionary<string, GameObject> activeCharacters = new Dictionary<string, GameObject>();

        public void SpawnStoryCharacters(List<StoryCharacterDTO> characters)
        {
            if (characters == null) return;

            int index = 0;
            foreach (var charDto in characters)
            {
                if (activeCharacters.ContainsKey(charDto.id)) continue;

                Vector3 spawnPos = new Vector3(-0.6f + index * 0.6f, 0f, 0.2f);
                GameObject instance = CreateCharacterInstance(charDto, spawnPos);
                activeCharacters[charDto.id] = instance;
                index++;
            }
        }

        private GameObject CreateCharacterInstance(StoryCharacterDTO dto, Vector3 position)
        {
            GameObject prefab = defaultHeroPrefab;

            string type = dto.type?.ToLower() ?? "generic";
            if (type.Contains("spider")) prefab = spidermanPrefab ?? defaultHeroPrefab;
            else if (type.Contains("bat")) prefab = batPrefab ?? defaultHeroPrefab;
            else if (type.Contains("cat")) prefab = catPrefab ?? defaultHeroPrefab;
            else if (type.Contains("bird")) prefab = birdPrefab ?? defaultHeroPrefab;

            GameObject go;
            if (prefab != null)
            {
                go = Instantiate(prefab, position, Quaternion.identity, transform);
            }
            else
            {
                // Fallback procedural capsule with color
                go = GameObject.CreatePrimitive(PrimitiveType.Capsule);
                go.transform.position = position;
                go.transform.parent = transform;
                if (!string.IsNullOrEmpty(dto.color) && ColorUtility.TryParseHtmlString(dto.color, out Color col))
                {
                    var renderer = go.GetComponent<Renderer>();
                    if (renderer != null) renderer.material.color = col;
                }
            }

            go.name = dto.name;
            float scale = dto.initialScale > 0 ? dto.initialScale : 0.6f;
            go.transform.localScale = Vector3.one * scale;

            return go;
        }

        public void ExecuteAction(CharacterActionDTO action)
        {
            if (!activeCharacters.TryGetValue(action.characterId, out GameObject character)) return;

            StartCoroutine(AnimateActionCoroutine(character, action));
        }

        private IEnumerator AnimateActionCoroutine(GameObject character, CharacterActionDTO action)
        {
            float elapsed = 0f;
            float duration = action.duration > 0 ? action.duration : 2f;
            Vector3 startPos = character.transform.position;
            Vector3 targetPos = action.targetPosition;

            bool isJump = action.action == "jump";
            float jumpHeight = 0.5f;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = Mathf.Clamp01(elapsed / duration);

                // Smoothstep
                float smoothT = Mathf.SmoothStep(0f, 1f, t);

                Vector3 current = Vector3.Lerp(startPos, targetPos, smoothT);
                if (isJump)
                {
                    current.y += Mathf.Sin(t * Mathf.PI) * jumpHeight;
                }

                character.transform.position = current;
                yield return null;
            }

            character.transform.position = targetPos;
            StoryBridge.Instance.NotifyWeb("OnActionFinished", JsonUtility.ToJson(action));
        }
    }
}
